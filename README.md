# Codeforce GitLab Metrics Dashboards

This monorepo contains a minimal prototype for visualising GitLab contributor metrics. The project uses npm workspaces to manage the frontend and backend apps.

## Requirements
- Node.js 20+
- npm 8+

## Scripts
- `npm run dev` – start frontend and backend in development mode.
- `npm run lint` – run ESLint.
- `npm run format` – run Prettier.
- `npm run build` – build both apps.
- `npm test` – run tests for both apps.

Environment variables for the backend:
- `GITLAB_PAT` – personal access token with API access.
- `GITLAB_BASE_URL` – GitLab instance URL (default `https://gitlab.com`).
- `CACHE_DIR` – override cache directory (default `~/.codeforce`).

See [docs/metrics.md](docs/metrics.md) for metric definitions.
