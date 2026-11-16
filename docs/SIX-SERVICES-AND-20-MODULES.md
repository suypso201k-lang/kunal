# KODEX CLOUD — Complete Service Scope

The product is presented as **six connected top-level services**. The 20 entries below are the requested sub-services grouped under those six services. The public landing page links to each service area; the signed-in workspace is protected behind Login/Sign up.

## 1. Data Cloud
1. Data Marketplace — dataset listing creation and pricing metadata; checkout and payouts require payment integration.
2. Private Data Vault — tenant-scoped file upload/download foundation.
3. Database Cloud — database provisioning/connection management interface scope (managed database integration required).
4. Backup Center — backup/restore workflow scope (scheduled durable backups require storage integration).
5. Data Analytics — dataset usage/analytics interface scope.

## 2. KODEX AI Studio
6. Multi-model AI Chat — common gateway adapters for OpenAI, Anthropic Claude, Google Gemini, DeepSeek, Mistral and Groq; provider credentials required.
7. AI App & Portal Builder — project and generation-task workflow foundation; the in-process background worker generates project files through a configured provider API.
8. AI Game Builder — project workflow scope; game engine/build worker integration required.
9. AI Coding Assistant — AI chat gateway can support coding prompts; repository-aware agent integration required.
10. AI Error Diagnosis — diagnostic workflow scope; build logs and agent integration required for automatic repair.

## 3. API Platform
11. API Marketplace — API product catalogue and purchase workflow scope; payment integration required.
12. API Gateway — API key create/revoke foundation; production request proxying, key verification and rate limiting require hardening.
13. Token Limits & Plans — plan/quota model scope; enforceable metering, billing and automatic upgrade require billing integration.

## 4. Code Forge
14. Git Repository Hosting — repository metadata foundation; full Git smart HTTP/SSH hosting requires a Git backend.
15. GitHub Connect & Auto Sync — integration point only; GitHub App/OAuth, webhook and push/pull sync setup required.

## 5. Cloud Deploy
16. Cloud App Hosting — service and deployment queue foundation; build runners/compute required to execute deployments.
17. Custom Domains & SSL — domain configuration scope; DNS verification and certificate automation require hosting/DNS integrations.
18. Logs, Monitoring & Alerts — audit and deployment-log foundations; production telemetry/alerting integration required.
19. Automatic Scaling & Workers — architecture scope; distributed scheduler, metrics and worker fleet required. This ZIP does not implement automatic sharding/autoscaling.

## 6. Control Center
20. Teams, Access & Security — basic account/tenant foundation; production RBAC, MFA, secure password hashing, durable sessions, CSRF and rate limiting must be added before public production use.

## Important implementation boundary
This is one runnable Node.js starter ZIP with all six service areas and all 20 module scopes represented. It is not a finished equivalent of GitHub, Render, Netlify or a national-scale cloud provider. Items explicitly marked integration-required are not live services merely because their scope is listed. Never expose the starter to real customer data or payments until the security, storage, billing, Git, deployment and scaling integrations are implemented and independently tested.
