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

  listProjects() {
    return this.fetch<any[]>('/projects?membership=true');
  }

  getUserEvents(userId: string) {
    return this.fetch<any[]>(`/users/${userId}/events`);
  }

  getProjectEvents(projectId: string) {
    return this.fetch<any[]>(`/projects/${projectId}/events`);
  }
}
