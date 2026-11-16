# Feature status matrix

| Area | Included in this ZIP | External setup / future engineering |
|---|---|---|
| Unified public landing page | Six linked service cards, Login and Sign up actions | SEO campaign and search-engine indexing cannot be guaranteed by source code alone |
| Accounts | Basic email/password signup and login | Production-grade password hashing, email verification, MFA, password reset, durable sessions, CSRF and rate limiting |
| Data Cloud | Tenant-scoped file upload/download foundation | Public dataset marketplace, payment, pricing enforcement, object storage, malware scan, large-file/resumable uploads |
| AI Studio | Prompt task records, preview shell, six provider adapters | Autonomous coding agent, generated build artifacts, sandboxed execution and deploy |
| API Marketplace | API key create/revoke and model catalogue | Public API product checkout, API gateway validation, metering, invoicing, token quotas and plan upgrade enforcement |
| Cloud Deploy | Service records and deployment queue records | GitHub App/OAuth, webhook auto-deploy, isolated workers, build logs, rollback, domains, TLS and scaling |
| Code Forge | Repository metadata records, visibility label, optional remote URL | Git protocol hosting, clone/push/pull, issues, pull requests, source browsing, GitHub synchronization |
| Control Center | Integration status endpoint | Billing, production monitoring, backups, multi-region scheduler and autoscaling |

The six AI options are external providers configured by environment variables, not six locally hosted models and not a proprietary KODEX-trained model. The current starter is single-instance JSON-backed and must not be used for production customer data without the hardening described in README.md.
