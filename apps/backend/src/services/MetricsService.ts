import { GitLabService } from './GitLabService';

export class MetricsService {
  constructor(private gitlab: GitLabService) {}

  async getUserMetrics(userId: string, refresh = false) {
    const events = await this.gitlab.getUserEvents(userId);
    return { eventsCount: events.length };
  }

  async getProjectMetrics(projectId: string, refresh = false) {
    const events = await this.gitlab.getProjectEvents(projectId);
    return { eventsCount: events.length };
  }
}
