import express from 'express';
import { GitLabService } from './services/GitLabService';
import { MetricsService } from './services/MetricsService';
import { Cache } from './services/Cache';

const app = express();
const port = process.env.PORT || 3000;

// Create a single shared cache instance
const sharedCache = new Cache();

const gitlab = new GitLabService(sharedCache); // Pass cache to GitLabService
const metrics = new MetricsService(gitlab);

app.get('/api/users/:id/contributions', async (req, res) => {
  const refresh = 'refresh' in req.query;
  const userId = req.params.id;
  try {
    const data = await metrics.getUserMetrics(userId, refresh);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/projects', async (_req, res) => {
  try {
    const projects = await gitlab.listProjects();
    res.json(projects);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/projects/:id/metrics', async (req, res) => {
  const refresh = 'refresh' in req.query;
  const id = req.params.id;
  try {
    const data = await metrics.getProjectMetrics(id, refresh);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
