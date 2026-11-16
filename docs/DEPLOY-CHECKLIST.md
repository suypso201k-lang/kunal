# Deployment checklist

1. Use Node.js 20 or later.
2. Copy `.env.example` to `.env` locally; never commit secrets.
3. Set unique `SESSION_SECRET`, `ADMIN_EMAIL`, and strong `ADMIN_PASSWORD` on the host.
4. Configure only the AI provider keys you have permission to use.
5. For a public production launch, first replace the JSON store with PostgreSQL, use durable object storage, secure password hashing and durable sessions, add CSRF/rate limiting/email verification/MFA, and review tenant isolation.
6. Add payment checkout + signed webhooks before selling data or API plans.
7. Add GitHub App/OAuth + webhook processing before advertising auto-sync.
8. Add isolated build workers and a deployment scheduler before executing customer builds.
9. Add DNS validation and automated TLS before advertising custom domains.
10. Add distributed metrics, queueing and worker orchestration before claiming autoscaling or AI worker sharding.
11. Test backups, restore, abuse controls, quotas, logs and incident response.

Render is a reasonable first place to evaluate this Node service. Its free tier and storage/runtime limits can change; check the current provider documentation and use paid durable infrastructure for real customer workloads.
