import { GitLabService } from './GitLabService';

// Basic interfaces for GitLab objects - these might need to be expanded
interface GitLabEvent {
  action_name: string;
  target_type: string | null;
  created_at: string;
  note?: {
    system: boolean;
    body: string;
    project_id?: string; // Added for comments on MRs/Issues in different projects
  };
  push_data?: {
    commit_count: number;
  };
  target_iid?: number; // For issues, MRs
  project_id?: string; // For events directly associated with a project
  project?: { // Embedded project info in some events
    id: string;
    name: string;
    web_url: string;
  };
  author_id?: number; // ID of the user who performed the action
}

interface GitLabMergeRequest {
  id: number;
  iid: number;
  project_id: number;
  author: { id: number; username: string };
  assignees: { id: number; username: string }[];
  reviewer?: { id: number; username: string }; // For single reviewer
  reviewers?: { id: number; username: string }[]; // For multiple reviewers
  source_project_id: number;
  target_project_id: number;
  title: string;
  state: 'opened' | 'merged' | 'closed';
  created_at: string;
  updated_at: string;
  merged_at?: string | null;
  closed_at?: string | null;
  web_url: string;
  diff_stats?: { // Available from getMergeRequestDetails with compute_metrics=true
    additions: number;
    deletions: number;
    total: number; // Additions + Deletions
  }
}

interface GitLabProject {
  id: string; // Or number, ensure consistency
  name: string;
  web_url: string;
}

export interface UserMetrics {
  commits: number;
  mergeRequestsOpened: number;
  mergeRequestsMerged: number; // Added this, as we fetch merged MRs for line stats
  codeReviews: number;
  issuesOpened: number;
  issuesClosed: number;
  linesAdded: number;
  linesDeleted: number;
  linesNet: number;
  contributedProjects: GitLabProject[];
}

export class MetricsService {
  constructor(private gitlab: GitLabService) {}

  async getUserMetrics(userId: string, refresh = false): Promise<UserMetrics> {
    const [
      events,
      openedMRs,
      mergedMRs, // For line stats, and to count separately if desired
      // contributedProjects // Let's use the dedicated endpoint
    ] = await Promise.all([
      this.gitlab.getUserEvents(userId, refresh),
      this.gitlab.getUserMergeRequests(userId, 'opened', refresh),
      this.gitlab.getUserMergeRequests(userId, 'merged', refresh),
      // this.gitlab.getUserContributedProjects(userId, refresh) // Fetching this separately
    ]);

    const contributedProjects = await this.gitlab.getUserContributedProjects(userId, refresh);


    let commits = 0;
    let codeReviews = 0;
    let issuesOpened = 0;
    let issuesClosed = 0;

    // Parse events
    for (const event of events as GitLabEvent[]) {
      // Commits from push events
      if (event.action_name === 'pushed to' && event.push_data && event.push_data.commit_count > 0) {
        // Ensure the event author is the user we are getting metrics for.
        // GitLab user events are usually for the user specified in the API call,
        // but push events might be tricky if they represent pushes by others to a project the user owns/watches.
        // However, /users/:id/events should be events *performed by* the user.
        commits += event.push_data.commit_count;
      }

      // Code Reviews from comments on Merge Requests
      if (event.action_name === 'commented on' && event.target_type === 'MergeRequest' && event.note && !event.note.system) {
        // Check if the commenter is the user in question. Events are from user, so this should be fine.
        codeReviews += 1;
      }
      // Consider MR approvals as well if event type exists (e.g., "approved")
      // GitLab event for MR approval is action_name: "approved" target_type: "MergeRequest"
      if (event.action_name === 'approved' && event.target_type === 'MergeRequest') {
        codeReviews +=1; // Counting each approval as a review action
      }


      // Issues Opened
      if (event.action_name === 'opened' && event.target_type === 'Issue') {
        issuesOpened += 1;
      }

      // Issues Closed
      if (event.action_name === 'closed' && event.target_type === 'Issue') {
        issuesClosed += 1;
      }
    }

    const mergeRequestsOpened = openedMRs.length;
    const mergeRequestsMerged = mergedMRs.length; // Count of MRs authored by user and merged

    let linesAdded = 0;
    let linesDeleted = 0;

    // Calculate Lines Added/Deleted from user's merged MRs
    // We use `mergedMRs` which are MRs *authored* by the user and are in 'merged' state.
    for (const mr of mergedMRs as GitLabMergeRequest[]) {
      // Fetch detailed MR info which includes diff_stats (additions/deletions)
      // The getMergeRequestDetails endpoint is more suitable for this than getMergeRequestCommits
      try {
        const mrDetails = await this.gitlab.getMergeRequestDetails(String(mr.project_id), String(mr.iid), refresh);
        if (mrDetails && mrDetails.diff_stats) {
          linesAdded += mrDetails.diff_stats.additions;
          linesDeleted += mrDetails.diff_stats.deletions;
        } else if (mrDetails && mrDetails.changes_count) {
          // Fallback: some MR objects might have 'changes_count' (lines changed) but not split additions/deletions.
          // This is not ideal. 'diff_stats' from 'compute_metrics=true' is preferred.
          // If only changes_count is available, we can't accurately get linesAdded/deleted.
          // The `getMergeRequestDetails` method already includes `compute_metrics=true`.
        }
      } catch (error) {
        console.error(`Error fetching details for MR ${mr.project_id}!${mr.iid}:`, error);
        // Decide how to handle: skip, retry, or log. For now, log and skip.
      }
    }

    // Alternative for lines added/deleted from commits on MRs (more granular, but more API calls)
    // This sums up commit stats within MRs. The MR diff_stats is usually more direct.
    // for (const mr of mergedMRs as GitLabMergeRequest[]) {
    //   try {
    //     const mrCommits = await this.gitlab.getMergeRequestCommits(String(mr.project_id), String(mr.iid), refresh);
    //     for (const commit of mrCommits) {
    //       if (commit.stats) { // Check if commit object has stats
    //         linesAdded += commit.stats.additions;
    //         linesDeleted += commit.stats.deletions;
    //       }
    //     }
    //   } catch (error) {
    //     console.error(`Error fetching commits for MR ${mr.project_id}!${mr.iid}:`, error);
    //   }
    // }


    return {
      commits,
      mergeRequestsOpened,
      mergeRequestsMerged,
      codeReviews,
      issuesOpened,
      issuesClosed,
      linesAdded,
      linesDeleted,
      linesNet: linesAdded - linesDeleted,
      contributedProjects: contributedProjects as GitLabProject[],
    };
  }

  // --- Project Metrics ---

  // Interface for individual commit stats from GitLab API
  interface GitLabCommitStats {
    additions: number;
    deletions: number;
    total: number;
  }

  // Interface for individual commit from GitLab API
  interface GitLabCommit {
    id: string;
    short_id: string;
    title: string;
    author_name: string;
    author_email: string;
    committer_name: string;
    committer_email: string;
    created_at: string; // ISO date string
    message: string;
    stats: GitLabCommitStats;
    web_url: string;
    author?: { id: number; username: string; name: string; avatar_url: string; web_url: string; }; // If available
  }

  // Interface for simplified MR info for lists
  interface ProjectMergeRequestInfo {
    id: number;
    iid: number;
    title: string;
    author: { id: number; username: string; name: string; avatar_url: string; web_url: string; };
    state: string;
    created_at: string;
    updated_at: string;
    web_url: string;
    size?: number; // e.g., total lines changed, or t-shirt size if available
    linesAdded?: number;
    linesDeleted?: number;
  }


  interface Contributor {
    // User details: name, email, or GitLab user object
    id?: string | number; // GitLab user ID if available
    name: string; // Author name or username
    avatar_url?: string;
    web_url?: string;
    // Metrics for this repository
    commits: number;
    mergeRequestsCreated: number; // MRs authored by this contributor
    // mergeRequestsReviewed: number; // Requires more complex parsing of review comments/approvals
    codeReviews: number; // Based on comments and approvals
    issuesOpened: number;
    issuesClosed: number;
    // linesAdded: number; // Could be added by summing commit stats per author
    // linesDeleted: number;
  }

  export interface ProjectMetrics {
    projectId: string;
    totalLinesAdded: number;
    totalLinesDeleted: number;
    totalLinesNet: number;
    activeMergeRequests: ProjectMergeRequestInfo[];
    mergedMergeRequests: ProjectMergeRequestInfo[];
    contributors: Contributor[];
    // Potentially other stats: total commits, total MRs, open issues count etc.
  }

  async getProjectMetrics(projectId: string, refresh = false): Promise<ProjectMetrics> {
    const [
      projectEvents,
      projectCommits, // Note: Currently fetches up to 100, pagination needed for full accuracy
      openedProjectMRs, // Note: Currently fetches up to 100
      mergedProjectMRs, // Note: Currently fetches up to 100
      projectMembers // Note: Currently fetches up to 100
    ] = await Promise.all([
      this.gitlab.getProjectEvents(projectId, refresh),
      this.gitlab.getProjectCommits(projectId, undefined, undefined, refresh),
      this.gitlab.getProjectMergeRequests(projectId, 'opened', 'all', refresh),
      this.gitlab.getProjectMergeRequests(projectId, 'merged', 'all', refresh),
      this.gitlab.getProjectMembers(projectId, refresh) // To get user details like avatar
    ]);

    let totalLinesAdded = 0;
    let totalLinesDeleted = 0;

    for (const commit of projectCommits as GitLabCommit[]) {
      if (commit.stats) {
        totalLinesAdded += commit.stats.additions;
        totalLinesDeleted += commit.stats.deletions;
      }
    }

    const processMRList = (mrs: GitLabMergeRequest[]): ProjectMergeRequestInfo[] => {
      return mrs.map(mr => {
        let size, linesAdded, linesDeleted;
        if (mr.diff_stats) { // Prefer diff_stats from MR object if available
          linesAdded = mr.diff_stats.additions;
          linesDeleted = mr.diff_stats.deletions;
          size = mr.diff_stats.total;
        } else if ((mr as any).changes_count) { // Fallback, less ideal
            // changes_count is often a string like "100 / 10 additions / 90 deletions"
            // Or it can be just total number of lines changed.
            // This part needs robust parsing if used. For now, use as 'size' if numeric.
            const changes = parseInt((mr as any).changes_count, 10);
            if (!isNaN(changes)) size = changes;
        }
        // If no direct stats, size remains undefined.
        // A call to getMergeRequestDetails would be needed for each, but that's too many API calls here.
        return {
          id: mr.id,
          iid: mr.iid,
          title: mr.title,
          author: mr.author, // Assuming author object is on MR
          state: mr.state,
          created_at: mr.created_at,
          updated_at: mr.updated_at,
          web_url: mr.web_url,
          size,
          linesAdded,
          linesDeleted,
        };
      });
    };

    const activeMergeRequests = processMRList(openedProjectMRs as GitLabMergeRequest[]);
    const mergedMergeRequests = processMRList(mergedProjectMRs as GitLabMergeRequest[]);

    // --- Contributors Panel ---
    const contributorsMap = new Map<string, Contributor>(); // Keyed by author_email or unique user ID

    const getContributor = (authorEmail: string, authorName?: string, userId?: number | string, userDetails?: any): Contributor => {
      const key = userId ? String(userId) : authorEmail; // Prefer user ID as key if available
      if (!contributorsMap.has(key)) {
        contributorsMap.set(key, {
          id: userId,
          name: authorName || authorEmail,
          avatar_url: userDetails?.avatar_url,
          web_url: userDetails?.web_url,
          commits: 0,
          mergeRequestsCreated: 0,
          codeReviews: 0,
          issuesOpened: 0,
          issuesClosed: 0,
        });
      }
      return contributorsMap.get(key)!;
    };

    // Create a lookup for project members by id for avatar and web_url
    const memberDetailsMap = new Map<number, any>();
    projectMembers.forEach(member => memberDetailsMap.set(member.id, member));

    // 1. Process Commits for Contributors
    for (const commit of projectCommits as GitLabCommit[]) {
      // Try to find user via author_id from commit if available, otherwise use email/name
      const userDetail = commit.author && memberDetailsMap.get(commit.author.id) ? memberDetailsMap.get(commit.author.id) : undefined;
      const contributor = getContributor(commit.author_email, commit.author_name, commit.author?.id, userDetail);
      contributor.commits += 1;
    }

    // 2. Process Merge Requests for Contributors (Authored)
    const allProjectMRs = [...openedProjectMRs, ...mergedProjectMRs] as GitLabMergeRequest[];
    for (const mr of allProjectMRs) {
      if (mr.author) {
        const userDetail = memberDetailsMap.get(mr.author.id);
        const contributor = getContributor(mr.author.username, mr.author.username, mr.author.id, userDetail); // Assuming username as email fallback if email not on author obj
        contributor.mergeRequestsCreated += 1;
      }
    }

    // 3. Process Project Events for Reviews and Issues by Contributors
    // This is complex because events are generic. We need to ensure event.author_id is reliable.
    for (const event of projectEvents as GitLabEvent[]) {
      // Ensure event has an author_id to attribute the action
      if (!event.author_id) continue;

      const userDetail = memberDetailsMap.get(event.author_id);
      // Use a placeholder if author details not found, though ideally they should be in projectMembers
      const authorNameForEvent = userDetail?.username || `User ${event.author_id}`;
      const authorEmailForEvent = userDetail?.email || `${event.author_id}@gitlab.user`; // Placeholder email

      const contributor = getContributor(authorEmailForEvent, authorNameForEvent, event.author_id, userDetail);

      // Code Reviews (comments on MRs and approvals)
      if (event.action_name === 'commented on' && event.target_type === 'MergeRequest' && event.note && !event.note.system) {
         // Check if event.project_id matches current projectId (projectEvents should already be filtered, but good practice)
        if (String(event.project_id) === projectId || (event.note.project_id && String(event.note.project_id) === projectId) ) {
            contributor.codeReviews += 1;
        }
      }
      if (event.action_name === 'approved' && event.target_type === 'MergeRequest') {
        // Similar check for project_id might be needed if events could come from related projects.
        // For getProjectEvents, this should be fine.
        contributor.codeReviews += 1;
      }

      // Issues Opened/Closed
      if (event.action_name === 'opened' && event.target_type === 'Issue') {
        contributor.issuesOpened += 1;
      }
      if (event.action_name === 'closed' && event.target_type === 'Issue') {
        contributor.issuesClosed += 1;
      }
    }

    return {
      projectId,
      totalLinesAdded,
      totalLinesDeleted,
      totalLinesNet: totalLinesAdded - totalLinesDeleted,
      activeMergeRequests,
      mergedMergeRequests,
      contributors: Array.from(contributorsMap.values()),
    };
  }
}
