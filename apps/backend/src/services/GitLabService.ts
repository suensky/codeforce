import axios, { AxiosInstance } from 'axios';
import { Cache } from './Cache';

export class GitLabService {
  private axios: AxiosInstance;
  private cache = new Cache();

  constructor() {
    const token = process.env.GITLAB_PAT;
    this.axios = axios.create({
      baseURL: process.env.GITLAB_BASE_URL || 'https://gitlab.com/api/v4',
      headers: token ? { 'PRIVATE-TOKEN': token } : {},
    });
  }

  async fetch<T>(url: string, refresh = false): Promise<T> {
    const key = url;
    if (!refresh) {
      const cached = this.cache.get<T>(key);
      if (cached) return cached;
    }
    const { data } = await this.axios.get<T>(url);
    this.cache.set(key, data);
    return data;
  }

  /**
   * Fetches all pages for a given GitLab API endpoint.
   * Handles caching of the full, concatenated result.
   * @param initialUrl The base URL for the request (without pagination parameters).
   * @param refresh Force refresh the cache.
   */
  private async fetchAllPaginated<T>(initialUrl: string, refresh = false): Promise<T[]> {
    const cacheKey = initialUrl; // Use the initial URL as the cache key for the full result

    if (!refresh) {
      const cachedData = this.cache.get<T[]>(cacheKey);
      if (cachedData) {
        // console.log(`Cache hit for paginated data: ${cacheKey}`);
        return cachedData;
      }
    }
    // console.log(`Cache miss or refresh for paginated data: ${cacheKey}`);

    const allItems: T[] = [];
    let nextPageUrl: string | null = initialUrl;
    const perPage = 100; // GitLab's max per_page

    // Ensure initialUrl has '?' or '&' correctly before adding per_page
    if (nextPageUrl.includes('?')) {
        nextPageUrl += `&per_page=${perPage}`;
    } else {
        nextPageUrl += `?per_page=${perPage}`;
    }

    let pageNum = 1;

    while (nextPageUrl) {
      // console.log(`Fetching page ${pageNum} for ${cacheKey}: ${nextPageUrl}`);
      const response = await this.axios.get<T[]>(nextPageUrl);
      allItems.push(...response.data);

      const linkHeader = response.headers['link'];
      nextPageUrl = null; // Reset for next iteration
      if (linkHeader) {
        const links = linkHeader.split(',').map(a => a.trim());
        const nextLinkEntry = links.find(link => link.endsWith('rel="next"'));
        if (nextLinkEntry) {
          nextPageUrl = nextLinkEntry.substring(nextLinkEntry.indexOf('<') + 1, nextLinkEntry.indexOf('>'));
        }
      }
      pageNum++;
    }

    this.cache.set(cacheKey, allItems);
    // console.log(`Cached ${allItems.length} items for ${cacheKey}`);
    return allItems;
  }

  listProjects(refresh = false) {
    // Fetches projects the authenticated user is a member of
    // Base URL: /projects?membership=true
    // This endpoint might also support pagination if many projects.
    const baseUrl = '/projects?membership=true';
    return this.fetchAllPaginated<any>(baseUrl, refresh);
  }

  getUserEvents(userId: string, refresh = false) {
    const baseUrl = `/users/${userId}/events`;
    return this.fetchAllPaginated<any>(baseUrl, refresh);
  }

  getProjectEvents(projectId: string, refresh = false) {
    const baseUrl = `/projects/${projectId}/events`;
    return this.fetchAllPaginated<any>(baseUrl, refresh);
  }

  // New methods for User Dashboard metrics

  /**
   * Fetches merge requests created by a specific user.
   * @param userId The ID of the user.
   * @param state Filter MRs by state. 'all' includes opened, merged, and closed.
   * @param refresh Force refresh the cache.
   */
  getUserMergeRequests(userId: string, state: 'opened' | 'merged' | 'closed' | 'all' = 'all', refresh = false) {
    // Base URL: /merge_requests?author_id=${userId}
    let baseUrl = `/merge_requests?author_id=${userId}`;
    if (state !== 'all') {
      baseUrl += `&state=${state}`;
    }
    return this.fetchAllPaginated<any>(baseUrl, refresh);
  }

  /**
   * Fetches projects where the user is a member.
   * This is similar to listProjects but could be filtered by user ID if the API supports it directly.
   * For now, if userId is for the authenticated user, /projects?membership=true is fine.
   * If userId is for another user, it typically requires admin rights to list their projects.
   * GitLab API: /users/:user_id/projects might be more appropriate.
   * @param userId The ID of the user.
   * @param refresh Force refresh the cache.
   */
  getUserProjects(userId: string, refresh = false) {
    // Base URL: /users/${userId}/projects?archived=false&min_access_level=10
    const baseUrl = `/users/${userId}/projects?archived=false&min_access_level=10`;
    return this.fetchAllPaginated<any>(baseUrl, refresh);
  }

  /**
   * Fetches commits for a specific merge request.
   * These commits often contain line stats (additions, deletions).
   * @param projectId The ID or URL-encoded path of the project.
   * @param mergeRequestIid The IID (internal ID) of the merge request.
   * @param refresh Force refresh the cache.
   */
  getMergeRequestCommits(projectId: string, mergeRequestIid: string, refresh = false) {
    // Base URL: /projects/${projectId}/merge_requests/${mergeRequestIid}/commits
    const baseUrl = `/projects/${projectId}/merge_requests/${mergeRequestIid}/commits`;
    return this.fetchAllPaginated<any>(baseUrl, refresh);
  }

  /**
   * Fetches a single merge request, which often contains detailed stats like diff stats.
   * @param projectId The ID or URL-encoded path of the project.
   * @param mergeRequestIid The IID (internal ID) of the merge request.
   * @param refresh Force refresh the cache.
   */
  getMergeRequestDetails(projectId: string, mergeRequestIid: string, refresh = false) {
    // This endpoint provides 'diff_stats' (additions/deletions) for the MR.
    // Docs: https://docs.gitlab.com/ee/api/merge_requests.html#get-single-mr
    return this.fetch<any>(`/projects/${projectId}/merge_requests/${mergeRequestIid}?compute_metrics=true`, refresh);
  }


  /**
   * Placeholder for fetching projects a user has actually contributed to.
   * This could be based on analyzing user events (push events, MR events) or project memberships.
   * A more robust implementation might iterate user's events and aggregate project IDs.
   * @param userId The ID of the user.
   * @param refresh Force refresh the cache.
   */
  async getUserContributedProjects(userId: string, refresh = false) {
    // Simple approach: Get user events, extract project IDs from push and MR events.
    // This could be refined.
    const events = await this.getUserEvents(userId, refresh);
    const projectIds = new Set<string>();

    events.forEach(event => {
      if (event.project_id) {
        projectIds.add(event.project_id);
      } else if (event.push_data && event.project_id) { // Older event format might have project_id here
         projectIds.add(event.project_id);
      }
      // For MR related events, project_id is usually at the top level of the event
      // For comment events, event.note.project_id might exist or event.project_id
    });

    // Fetch project details for these unique IDs
    // This might be too many calls if the user is very active.
    // For now, returning unique project IDs found in events.
    // A better approach might be to return project objects directly if already fetched or make specific project calls.
    // The current listProjects or getUserProjects might be a starting point, then filter by activity.

    // For this iteration, we will list projects the user is a member of, and then filter by actual contributions in MetricsService
    // Or, more simply, derive from events.
    // Let's try deriving from events for now as per the name "ContributedProjects"

    const contributedProjects = new Map<string, { id: string; name: string; web_url: string }>();

    for (const event of events) {
      let projectId: string | undefined = undefined;
      let projectName: string | undefined = undefined;
      let projectWebUrl: string | undefined = undefined;

      // Common event structure for project_id
      if (event.project_id) {
        projectId = String(event.project_id);
      }

      // Attempt to get project details from various event types
      if (event.project) { // some events embed project object
        projectId = String(event.project.id);
        projectName = event.project.name;
        projectWebUrl = event.project.web_url;
      } else if (event.target_type === 'MergeRequest' && event.note && event.note.project_id) {
         // For notes on MRs, project_id might be on the note or the MR itself if that data is part of event
      }


      // If we have a project ID and haven't processed it yet
      if (projectId && !contributedProjects.has(projectId)) {
        // If name and web_url are missing, we'd ideally fetch project details
        // For now, we'll add what we have. A full project fetch here could be too slow.
        // Placeholder name if not available in event
        contributedProjects.set(projectId, {
          id: projectId,
          name: projectName || `Project ${projectId}`, // Fallback name
          web_url: projectWebUrl || '', // Fallback URL
        });
      }
    }
    return Array.from(contributedProjects.values());
  }

  // New methods for Project Dashboard metrics

  /**
   * Fetches merge requests for a specific project.
   * @param projectId The ID or URL-encoded path of the project.
   * @param state Filter MRs by state. 'opened', 'merged', 'closed', 'locked', or 'all'.
   * @param scope Filter MRs by scope.
   * @param refresh Force refresh the cache.
   */
  getProjectMergeRequests(
    projectId: string,
    state: 'opened' | 'merged' | 'closed' | 'locked' | 'all' = 'all',
    scope: 'all' | 'created_by_me' | 'assigned_to_me' = 'all',
    refresh = false
  ) {
    // Base URL: /projects/${projectId}/merge_requests
    let baseUrl = `/projects/${projectId}/merge_requests?`; // Add '?' for query params
    if (state !== 'all') {
      baseUrl += `state=${state}&`;
    }
    if (scope !== 'all') {
      baseUrl += `scope=${scope}&`;
    }
    // Remove trailing '&' or '?' if no params were added, or ensure it's clean
    if (baseUrl.endsWith('&')) {
      baseUrl = baseUrl.slice(0, -1);
    }
    if (baseUrl.endsWith('?')) {
      baseUrl = baseUrl.slice(0, -1);
    }
    return this.fetchAllPaginated<any>(baseUrl, refresh);
  }

  /**
   * Fetches commits for a project, potentially within a date range.
   * Each commit object from GitLab API includes stats (additions, deletions, total).
   * @param projectId The ID or URL-encoded path of the project.
   * @param since Start date for commits (YYYY-MM-DDTHH:MM:SSZ).
   * @param until End date for commits (YYYY-MM-DDTHH:MM:SSZ).
   * @param refresh Force refresh the cache.
   */
  getProjectCommits(projectId: string, since?: string, until?: string, refresh = false) {
    // Base URL: /projects/${projectId}/repository/commits
    let baseUrl = `/projects/${projectId}/repository/commits?`;
    if (since) {
      baseUrl += `since=${since}&`;
    }
    if (until) {
      baseUrl += `until=${until}&`;
    }
     // Remove trailing '&' or '?'
    if (baseUrl.endsWith('&') || baseUrl.endsWith('?')) {
      baseUrl = baseUrl.slice(0, -1);
    }
    return this.fetchAllPaginated<any>(baseUrl, refresh);
  }

  /**
   * Fetches members of a project.
   * @param projectId The ID or URL-encoded path of the project.
   * @param refresh Force refresh the cache.
   */
  getProjectMembers(projectId: string, refresh = false) {
    // Base URL: /projects/${projectId}/members/all
    // Using /members/all to include inherited members as well, as per previous code.
    // Use /members for direct members only if needed.
    const baseUrl = `/projects/${projectId}/members/all`;
    return this.fetchAllPaginated<any>(baseUrl, refresh);
  }
}
