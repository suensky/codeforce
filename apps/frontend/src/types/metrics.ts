export interface GitLabProject {
  id: string; // Or number, ensure consistency
  name: string;
  web_url: string;
}

export interface UserContributionMetrics {
  commits: number;
  mergeRequestsOpened: number;
  mergeRequestsMerged: number;
  codeReviews: number;
  issuesOpened: number;
  issuesClosed: number;
  linesAdded: number;
  linesDeleted: number;
  linesNet: number;
  contributedProjects: GitLabProject[];
  // Add other potential fields based on backend's UserMetrics
}

export interface ProjectContributionMetrics {
  projectId: string;
  totalLinesAdded: number;
  totalLinesDeleted: number;
  totalLinesNet: number;
  activeMergeRequests: Array<{
    id: number;
    iid: number;
    title: string;
    author: { id: number; username: string; name: string; avatar_url: string; web_url: string; };
    state: string;
    created_at: string;
    updated_at: string;
    web_url: string;
    size?: number;
    linesAdded?: number;
    linesDeleted?: number;
  }>;
  mergedMergeRequests: Array<{
    id: number;
    iid: number;
    title: string;
    author: { id: number; username: string; name: string; avatar_url: string; web_url: string; };
    state: string;
    created_at: string;
    updated_at: string;
    web_url: string;
    size?: number;
    linesAdded?: number;
    linesDeleted?: number;
  }>;
  contributors: Array<{
    id?: string | number;
    name: string;
    avatar_url?: string;
    web_url?: string;
    commits: number;
    mergeRequestsCreated: number;
    codeReviews: number;
    issuesOpened: number;
    issuesClosed: number;
  }>;
}
