# Architecture

The monolithic Node.js server is intentionally dependency-free for easy GitHub upload and first-run evaluation.

- `server.js`: HTTP routing, static assets, auth and service APIs.
- `src/store.js`: atomic JSON persistence for development.
- `public/`: dashboard, live builder workspace and browser-side API client.
- `data/`: runtime metadata (ignored by Git).
- `storage/tenants/`: uploaded files separated by tenant ID (ignored by Git).

Recommended production evolution:
1. Move identity and metadata to PostgreSQL.
2. Put uploads in private S3-compatible object storage.
3. Add queue + isolated worker fleet for builds and AI generation.
4. Use a scheduler with capacity-aware placement and explicit migration plans.
5. Add OIDC/GitHub App integration, signed webhooks and repository-scoped permissions.
6. Add billing provider, metering reconciliation and abuse controls.
