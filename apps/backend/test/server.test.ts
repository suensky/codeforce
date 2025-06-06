import request from 'supertest';
import express from 'express';
import { GitLabService } from '../src/services/GitLabService';
import { MetricsService } from '../src/services/MetricsService';
import { Cache } from '../src/services/Cache';

const app = express();
const gitlab = new GitLabService();
const metrics = new MetricsService(gitlab);

app.get('/api/users/:id/contributions', async (req, res) => {
  const data = await metrics.getUserMetrics(req.params.id, true);
  res.json(data);
});

describe('GET /api/users/:id/contributions', () => {
  it('returns data', async () => {
    const res = await request(app).get('/api/users/1/contributions');
    expect(res.status).toBe(200);
  });
});
