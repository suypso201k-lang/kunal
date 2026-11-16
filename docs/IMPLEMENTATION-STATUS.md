# KODEX CLOUD implementation status (v1.3.0)

## Working in this package
- Branded public landing portal with six connected service areas and account entry points.
- Signup/login and tenant-scoped workspace.
- Private file upload/download with a 5 MB starter limit.
- Dataset marketplace listing creation/removal and public/private listing metadata. This is a catalogue, not a payment processor or buyer entitlement system.
- KODEX-branded AI gateway with six configurable model-provider adapters.
- Persistent task queue and an in-process background AI worker. With a valid provider key, it requests a project implementation, validates relative file paths, and saves generated source files to the project record. Generated files are viewable in the builder.
- API key creation and revocation, model configuration status, project records, repository metadata, service records and deployment request queue.
- Health endpoint and basic deployment templates.

## Required external infrastructure / not included as a live service
- A separately trained proprietary foundation model. The KODEX AI layer here is your branded orchestration + background worker using provider APIs; it is not a newly trained model.
- Payments, seller payouts, tax handling, refunds, buyer download entitlements and paid dataset checkout.
- Production-grade API gateway with key-authenticated public proxying, rate limits, quotas and token billing.
- Git smart HTTP/SSH hosting, GitHub OAuth/App installation, webhook verification and bidirectional auto-sync.
- Isolated build containers, real deployments, runtime hosting, custom domain DNS verification, automatic TLS, logs/metrics/alerts and distributed autoscaling.
- Managed database/object storage, durable backups and multi-node queue coordination.

## Before public production
This is a deployable development foundation, not a production cloud provider. It currently uses a JSON file database and process-memory sessions, has no MFA/CSRF/rate limiting, and needs a security review. Use a managed database, durable object storage, secure session store, scrypt/Argon2 password hashing, TLS, secrets management, backups and isolated workers before accepting customer data or payments. Do not run untrusted repository code in the web process.

## AI worker operation
Set one or more provider API keys in the hosting environment. Set `KODEX_DEFAULT_AI_PROVIDER` to `openai`, `anthropic-claude`, `google-gemini`, `deepseek`, `mistral`, or `groq`. The worker runs in the same Node process and processes one queued generation task at a time. For production, move it to a separately deployed worker with a durable shared queue.
