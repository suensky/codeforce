import { MetricsService } from '../../src/services/MetricsService';
import { GitLabService } from '../../src/services/GitLabService';
import { Cache } from '../../src/services/Cache'; // Only needed if GitLabService mock needs it

// Mock GitLabService
jest.mock('../../src/services/GitLabService');

describe('MetricsService', () => {
  let mockGitLabService: jest.Mocked<GitLabService>;
  let metricsService: MetricsService;
  let mockCache: jest.Mocked<Cache>; // Mock cache if GitLabService constructor needs it

  beforeEach(() => {
    // Create a mock Cache instance if required by GitLabService's constructor mock
    // For unit testing MetricsService, the cache interaction is indirect via GitLabService.
    // If GitLabService's constructor expects a Cache, we provide a minimal mock.
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      lru: { clear: jest.fn() } as any, // Add any Cache methods if GitLabService constructor interacts
    } as jest.Mocked<Cache>;

    // Instantiate the mocked GitLabService.
    // The actual constructor of GitLabService (the real one) expects a Cache instance.
    // So, the mock constructor should also be callable with a Cache instance.
    mockGitLabService = new (GitLabService as jest.Mock<GitLabService>)(mockCache) as jest.Mocked<GitLabService>;

    // Instantiate MetricsService with the mocked GitLabService
    metricsService = new MetricsService(mockGitLabService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('getUserMetrics', () => {
    it('should calculate user metrics correctly from GitLab data', async () => {
      // Mock GitLabService responses
      mockGitLabService.getUserEvents.mockResolvedValue([
        { action_name: 'pushed to', push_data: { commit_count: 5 }, project_id: '1' },
        { action_name: 'opened', target_type: 'Issue', project_id: '1' },
        { action_name: 'closed', target_type: 'Issue', project_id: '1' },
        { action_name: 'commented on', target_type: 'MergeRequest', note: { system: false }, project_id: '1' },
        { action_name: 'approved', target_type: 'MergeRequest', project_id: '1' },
        { action_name: 'pushed to', push_data: { commit_count: 3 }, project_id: '2' },
      ]);
      mockGitLabService.getUserMergeRequests.mockImplementation(async (_userId, state) => {
        if (state === 'opened') return [{ id: 1, iid: 1, project_id: 1 }, { id: 2, iid: 2, project_id: 1 }];
        if (state === 'merged') return [{ id: 3, iid: 3, project_id: 2, diff_stats: { additions: 100, deletions: 50, total: 150 } }];
        return [];
      });
      mockGitLabService.getMergeRequestDetails.mockImplementation(async (projectId, mrId) => {
        if (projectId === '2' && mrId === '3') { // Ensure this matches the merged MR above
            return { id: 3, iid: 3, project_id: 2, diff_stats: { additions: 100, deletions: 50, total: 150 } };
        }
        return { id: 0, iid: 0, project_id: 0, diff_stats: { additions: 0, deletions: 0, total: 0 } };
      });
      mockGitLabService.getUserContributedProjects.mockResolvedValue([
        { id: '1', name: 'Project Alpha', web_url: '' },
        { id: '2', name: 'Project Beta', web_url: '' },
      ]);

      const metrics = await metricsService.getUserMetrics('testUser');

      expect(metrics.commits).toBe(8); // 5 + 3
      expect(metrics.issuesOpened).toBe(1);
      expect(metrics.issuesClosed).toBe(1);
      expect(metrics.codeReviews).toBe(2); // 1 comment + 1 approval
      expect(metrics.mergeRequestsOpened).toBe(2);
      expect(metrics.mergeRequestsMerged).toBe(1);
      expect(metrics.linesAdded).toBe(100);
      expect(metrics.linesDeleted).toBe(50);
      expect(metrics.linesNet).toBe(50);
      expect(metrics.contributedProjects.length).toBe(2);
      expect(mockGitLabService.getUserEvents).toHaveBeenCalledWith('testUser', false);
      expect(mockGitLabService.getUserMergeRequests).toHaveBeenCalledWith('testUser', 'opened', false);
      expect(mockGitLabService.getUserMergeRequests).toHaveBeenCalledWith('testUser', 'merged', false);
      expect(mockGitLabService.getMergeRequestDetails).toHaveBeenCalledTimes(1); // For the single merged MR
    });

    it('should handle no activity for user metrics', async () => {
      mockGitLabService.getUserEvents.mockResolvedValue([]);
      mockGitLabService.getUserMergeRequests.mockResolvedValue([]);
      mockGitLabService.getUserContributedProjects.mockResolvedValue([]);
      // getMergeRequestDetails won't be called if no merged MRs

      const metrics = await metricsService.getUserMetrics('testUserNoActivity');
      expect(metrics.commits).toBe(0);
      expect(metrics.issuesOpened).toBe(0);
      expect(metrics.issuesClosed).toBe(0);
      expect(metrics.codeReviews).toBe(0);
      expect(metrics.mergeRequestsOpened).toBe(0);
      expect(metrics.mergeRequestsMerged).toBe(0);
      expect(metrics.linesAdded).toBe(0);
      expect(metrics.linesDeleted).toBe(0);
      expect(metrics.linesNet).toBe(0);
      expect(metrics.contributedProjects.length).toBe(0);
    });
  });

  describe('getProjectMetrics', () => {
    it('should calculate project metrics correctly from GitLab data', async () => {
      const projectId = 'testProject1';
      const mockCommits = [
        { author_email: 'a@a.com', author_name: 'User A', stats: { additions: 10, deletions: 5, total: 15 }, author: {id: 1} },
        { author_email: 'b@b.com', author_name: 'User B', stats: { additions: 20, deletions: 2, total: 22 }, author: {id: 2} },
        { author_email: 'a@a.com', author_name: 'User A', stats: { additions: 5, deletions: 1, total: 6 }, author: {id: 1} },
      ];
      const mockOpenedMRs = [
        { id: 1, iid: 1, project_id: 1, title: 'Open MR1', author: { id: 1, username: 'user_a', name:'User A' }, state: 'opened', created_at: '', updated_at: '', web_url: '', diff_stats: {additions:10, deletions:0, total:10} },
      ];
      const mockMergedMRs = [
        { id: 2, iid: 2, project_id: 1, title: 'Merged MR1', author: { id: 2, username: 'user_b', name:'User B' }, state: 'merged', created_at: '', updated_at: '', web_url: '', diff_stats: {additions:100, deletions:50, total:150} },
      ];
      const mockEvents = [
        { action_name: 'opened', target_type: 'Issue', author_id: 1, project_id: projectId },
        { action_name: 'commented on', target_type: 'MergeRequest', note: { system: false }, author_id: 2, project_id: projectId },
        { action_name: 'approved', target_type: 'MergeRequest', author_id: 1, project_id: projectId },
      ];
      const mockMembers = [ {id: 1, username: 'user_a', name: 'User A'}, {id: 2, username: 'user_b', name: 'User B'}];

      mockGitLabService.getProjectCommits.mockResolvedValue(mockCommits);
      mockGitLabService.getProjectMergeRequests.mockImplementation(async (_pId, state) => {
        if (state === 'opened') return mockOpenedMRs;
        if (state === 'merged') return mockMergedMRs;
        return [];
      });
      mockGitLabService.getProjectEvents.mockResolvedValue(mockEvents);
      mockGitLabService.getProjectMembers.mockResolvedValue(mockMembers);

      const metrics = await metricsService.getProjectMetrics(projectId);

      expect(metrics.totalLinesAdded).toBe(35); // 10 + 20 + 5
      expect(metrics.totalLinesDeleted).toBe(8); // 5 + 2 + 1
      expect(metrics.totalLinesNet).toBe(27);

      expect(metrics.activeMergeRequests.length).toBe(1);
      expect(metrics.activeMergeRequests[0].title).toBe('Open MR1');
      expect(metrics.activeMergeRequests[0].size).toBe(10);


      expect(metrics.mergedMergeRequests.length).toBe(1);
      expect(metrics.mergedMergeRequests[0].title).toBe('Merged MR1');
      expect(metrics.mergedMergeRequests[0].size).toBe(150);


      expect(metrics.contributors.length).toBe(2);
      const contributorA = metrics.contributors.find(c => c.name === 'User A');
      const contributorB = metrics.contributors.find(c => c.name === 'User B');

      expect(contributorA?.commits).toBe(2);
      expect(contributorA?.mergeRequestsCreated).toBe(1); // Open MR1
      expect(contributorA?.issuesOpened).toBe(1);
      expect(contributorA?.codeReviews).toBe(1); // 1 approval

      expect(contributorB?.commits).toBe(1);
      expect(contributorB?.mergeRequestsCreated).toBe(1); // Merged MR1
      expect(contributorB?.issuesOpened).toBe(0);
      expect(contributorB?.codeReviews).toBe(1); // 1 comment
    });

     it('should handle no activity for project metrics', async () => {
      mockGitLabService.getProjectCommits.mockResolvedValue([]);
      mockGitLabService.getProjectMergeRequests.mockResolvedValue([]);
      mockGitLabService.getProjectEvents.mockResolvedValue([]);
      mockGitLabService.getProjectMembers.mockResolvedValue([]);

      const metrics = await metricsService.getProjectMetrics('testProjectNoActivity');
      expect(metrics.totalLinesAdded).toBe(0);
      expect(metrics.totalLinesDeleted).toBe(0);
      expect(metrics.activeMergeRequests.length).toBe(0);
      expect(metrics.mergedMergeRequests.length).toBe(0);
      expect(metrics.contributors.length).toBe(0);
    });
  });
});
