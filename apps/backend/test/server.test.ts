import request from 'supertest';
import express, { Express } from 'express';
import { GitLabService } from '../src/services/GitLabService';
import { MetricsService } from '../src/services/MetricsService';
import { Cache } from '../src/services/Cache';

// Mock GitLabService
jest.mock('../src/services/GitLabService');

// Function to create a new app instance with services for testing
// This mirrors the setup in src/server.ts but uses the mocked GitLabService
const createAppInstance = () => {
  const app = express();
  const cache = new Cache(); // Real cache for testing cache behavior

  // Ensure that the mock implementation is correctly typed and used
  const gitLabServiceMock = new (GitLabService as jest.Mock<GitLabService>)(cache) as jest.Mocked<GitLabService>;
  const metricsService = new MetricsService(gitLabServiceMock);

  // Define routes as in src/server.ts
  app.get('/api/projects', async (_req, res) => {
    const refresh = 'refresh' in _req.query;
    try {
      // Note: listProjects now requires 'refresh' to be passed if we want to adhere to its new signature strictly.
      // However, the original server.ts didn't pass refresh to listProjects. Assuming listProjects handles default refresh=false.
      const projects = await gitLabServiceMock.listProjects(refresh);
      res.json(projects);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/users/:id/contributions', async (req, res) => {
    const refresh = 'refresh' in req.query;
    const userId = req.params.id;
    try {
      const data = await metricsService.getUserMetrics(userId, refresh);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/projects/:id/metrics', async (req, res) => {
    const refresh = 'refresh' in req.query;
    const id = req.params.id;
    try {
      const data = await metricsService.getProjectMetrics(id, refresh);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
  return { app, gitLabServiceMock, cache };
};


describe('API Endpoints', () => {
  let app: Express;
  let gitLabServiceMock: jest.Mocked<GitLabService>;
  let cache: Cache; // To allow cache clearing if needed

  beforeEach(() => {
    const instance = createAppInstance();
    app = instance.app;
    gitLabServiceMock = instance.gitLabServiceMock;
    cache = instance.cache;

    // Clear all mocks before each test
    jest.clearAllMocks();
    // Clear LRU cache in memory. For filesystem cache, manual deletion would be needed if tests interfere.
    cache.lru.clear();
  });

  describe('GET /api/projects', () => {
    it('should return projects successfully', async () => {
      const mockProjects = [{ id: 1, name: 'Test Project' }];
      gitLabServiceMock.listProjects.mockResolvedValue(mockProjects);

      const response = await request(app).get('/api/projects');
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockProjects);
      expect(gitLabServiceMock.listProjects).toHaveBeenCalledTimes(1);
      expect(gitLabServiceMock.listProjects).toHaveBeenCalledWith(false); // refresh = false by default
    });

    it('should handle caching for /api/projects', async () => {
      const mockProjects = [{ id: 1, name: 'Test Project' }];
      gitLabServiceMock.listProjects.mockResolvedValue(mockProjects);

      await request(app).get('/api/projects'); // First call
      await request(app).get('/api/projects'); // Second call

      expect(gitLabServiceMock.listProjects).toHaveBeenCalledTimes(1); // Should be called once due to caching

      await request(app).get('/api/projects?refresh=true'); // Call with refresh
      expect(gitLabServiceMock.listProjects).toHaveBeenCalledTimes(2); // Called again
      expect(gitLabServiceMock.listProjects).toHaveBeenLastCalledWith(true);
    });

    it('should return 500 if listProjects throws an error', async () => {
      gitLabServiceMock.listProjects.mockRejectedValue(new Error('GitLab Error'));

      const response = await request(app).get('/api/projects');
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('GitLab Error');
    });
  });

  describe('GET /api/users/:id/contributions', () => {
    it('should return user contributions successfully', async () => {
      const mockUserMetrics = { commits: 10, issuesOpened: 5 };
      // Mock methods called by metricsService.getUserMetrics
      // Assuming getUserMetrics calls gitLabService.getUserEvents, .getUserMergeRequests, etc.
      // These mocks need to be set up according to what getUserMetrics actually calls.
      // For simplicity, we'll assume getUserMetrics returns directly for this example,
      // but in a real scenario, you'd mock the GitLabService methods.
      // This test actually tests MetricsService indirectly.
      // A more focused test would mock metricsService.getUserMetrics itself if we only test the route.
      // However, the goal is integration, so mocking GitLabService is correct.

      gitLabServiceMock.getUserEvents.mockResolvedValue([]); // example
      gitLabServiceMock.getUserMergeRequests.mockResolvedValue([]); // example
      gitLabServiceMock.getUserContributedProjects.mockResolvedValue([]); // example
      // ... other necessary mocks for getUserMetrics ...

      // Let's mock the result of `metricsService.getUserMetrics` for a simpler integration test of the route logic itself.
      // To do this properly, MetricsService would need to be part of the `createAppInstance` return or mocked differently.
      // For now, we rely on the mocks of GitLabService methods that getUserMetrics calls.
      // This requires that getUserMetrics is robust enough to return a structure even with empty arrays from GitLabService.

      const response = await request(app).get('/api/users/123/contributions');
      expect(response.status).toBe(200);
      // Example: Asserting the structure based on what MetricsService would return with empty Gitlab data
      expect(response.body).toHaveProperty('commits');
      expect(response.body).toHaveProperty('mergeRequestsOpened');
      // Add more assertions based on the actual structure of UserMetrics
    });

    it('should handle caching for /api/users/:id/contributions', async () => {
        gitLabServiceMock.getUserEvents.mockResolvedValue([]);
        gitLabServiceMock.getUserMergeRequests.mockResolvedValue([]);
        gitLabServiceMock.getUserContributedProjects.mockResolvedValue([]);
        // ... other necessary mocks ...

        await request(app).get('/api/users/123/contributions');
        await request(app).get('/api/users/123/contributions');

        // Check if the underlying GitLabService methods were cached as expected
        // Example: check call count for a method that should be cached by GitLabService's fetchAllPaginated
        expect(gitLabServiceMock.getUserEvents).toHaveBeenCalledTimes(1);

        await request(app).get('/api/users/123/contributions?refresh=true');
        expect(gitLabServiceMock.getUserEvents).toHaveBeenCalledTimes(2); // Called again due to refresh
    });

    it('should return 500 if an underlying service call fails', async () => {
      gitLabServiceMock.getUserEvents.mockRejectedValue(new Error('GitLab User Events Error'));

      const response = await request(app).get('/api/users/123/contributions');
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('GitLab User Events Error');
    });
  });

  describe('GET /api/projects/:id/metrics', () => {
    it('should return project metrics successfully', async () => {
      // Similar to user contributions, mock all GitLabService methods
      // that getProjectMetrics relies upon.
      gitLabServiceMock.getProjectEvents.mockResolvedValue([]);
      gitLabServiceMock.getProjectCommits.mockResolvedValue([]);
      gitLabServiceMock.getProjectMergeRequests.mockResolvedValue([]);
      gitLabServiceMock.getProjectMembers.mockResolvedValue([]);
      // ... other necessary mocks ...

      const response = await request(app).get('/api/projects/789/metrics');
      expect(response.status).toBe(200);
      // Assert the structure of project metrics
      expect(response.body).toHaveProperty('totalLinesAdded');
      expect(response.body).toHaveProperty('contributors');
    });

    it('should handle caching for /api/projects/:id/metrics', async () => {
        gitLabServiceMock.getProjectEvents.mockResolvedValue([]);
        gitLabServiceMock.getProjectCommits.mockResolvedValue([]);
        gitLabServiceMock.getProjectMergeRequests.mockResolvedValue([]);
        gitLabServiceMock.getProjectMembers.mockResolvedValue([]);

        await request(app).get('/api/projects/789/metrics');
        await request(app).get('/api/projects/789/metrics');

        expect(gitLabServiceMock.getProjectCommits).toHaveBeenCalledTimes(1); // Example cached call

        await request(app).get('/api/projects/789/metrics?refresh=true');
        expect(gitLabServiceMock.getProjectCommits).toHaveBeenCalledTimes(2);
    });

    it('should return 500 if an underlying service call fails', async () => {
      gitLabServiceMock.getProjectCommits.mockRejectedValue(new Error('GitLab Project Commits Error'));

      const response = await request(app).get('/api/projects/789/metrics');
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('GitLab Project Commits Error');
    });
  });
});
