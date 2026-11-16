# KODEX CLOUD — Six-Service Unified Platform

A single GitHub-uploadable Node.js project that extends the earlier KODEX CLOUD starter. It provides one public landing page and one signed-in workspace for six connected service areas:

1. **Data Cloud** — tenant-scoped file upload/download foundation.
2. **KODEX AI Studio** — prompt-to-project task workflow and preview shell.
3. **API Marketplace** — create/revoke KODEX API keys and view model catalogue.
4. **Cloud Deploy** — register services and queue deployment records.
5. **Code Forge** — create repository metadata records with public/private visibility and optional Git remote URL.
6. **Control Center** — integration status and platform configuration guidance.

The AI gateway includes adapters for six configurable providers: OpenAI, Anthropic Claude, Google Gemini, DeepSeek, Mistral and Groq. Configure provider keys on the server. These are external model providers behind a common gateway; this archive does **not** contain a newly trained proprietary foundation model.

## Run locally

- Node.js 20+
- `cp .env.example .env` (or copy manually on Windows)
- Set a strong `SESSION_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`.
- Run `npm start` and open `http://localhost:3000`.
- The first public page has Login and Sign up buttons; sign-in is not forced on the landing page.

No third-party npm dependencies are required.

## Deploy

The repository includes `render.yaml` and `Dockerfile`. Render is the simplest initial target for this Node web service: create a new Web Service from the GitHub repository and add the environment variables from `.env.example`. Do not commit `.env` or API keys. The included JSON database and local file storage are suitable only for a small single-instance demo; use a managed database and persistent object storage before real customer workloads. A free hosting tier may sleep, have resource limits, or lack persistent disks; check the provider's current plan details before launch.

## Included API routes

- `GET /api/health`
- `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/me`
- `GET /api/overview`
- `GET|POST /api/keys`, `DELETE /api/keys/:id`
- `GET /api/models`, `POST /api/ai/chat` (choose provider with `provider`; messages in request body)
- `GET|POST /api/projects`, `POST /api/projects/:id/generate`
- `GET|POST /api/services`, `POST /api/services/:id/deploy`
- `GET|POST /api/data/files`, `GET /api/data/files/:id`
- `GET|POST /api/repos`
- `GET /api/integrations`

## Important: what is and is not production-ready

This is a **runnable foundation**, not a fully operational national cloud provider. The included repository feature stores repository metadata; it does not yet clone, serve Git repositories, implement Git smart HTTP/SSH, or sync commits from GitHub. GitHub OAuth, webhook-driven auto-deploy, isolated build workers, live build logs, rollback, custom-domain DNS/TLS provisioning, payment checkout, API/data product sales, token billing/enforcement, public dataset catalogue, multi-region autoscaling, automatic AI worker sharding, and SEO ranking are integration work and are not activated by this starter. The AI builder currently creates tracked tasks and a preview shell; it does not autonomously generate/deploy a complete application. The deployment route queues records only and never executes untrusted code.

The six provider integrations require valid paid/free-tier credentials and may have different API formats, quotas, and model availability. Add keys as host environment variables; never put them in frontend code or GitHub.

Before production: replace JSON storage with managed PostgreSQL, add durable sessions and secure password hashing, CSRF/rate limiting/email verification, role/tenant authorization review, secret encryption, malware scanning, backups, object storage, payment provider and webhook verification, quotas, audit retention, monitoring, and independent security testing. Configure HTTPS and a persistent volume if evaluating this starter on a single instance.

## Default development admin

For local evaluation only, defaults are `admin@kodexcloud.local` / `ChangeMe123!`. Set your own credentials in the host environment before exposing the app publicly.


## v1.3.0 implementation update

This package includes a persistent in-process AI generation queue, a KODEX-branded background worker using configured model-provider APIs, generated project-file storage/viewing, and dataset marketplace listing workflows. Configure provider keys in your host environment; never place keys in browser code. The KODEX AI layer is not a separately trained foundation model. Review `docs/IMPLEMENTATION-STATUS.md` for the exact working scope and external infrastructure still required before production.

## KODEX AI local model and training kit

The archive now includes `ai-model/` with an Ollama-compatible local inference adapter, a KODEX-branded Modelfile, a starter product/instruction dataset, and LoRA fine-tuning/merge scripts. In the AI builder, choose **KODEX AI · Local model endpoint**. Install and run Ollama on the same machine/network, pull a coding model, and configure `KODEX_LOCAL_BASE_URL`, `KODEX_LOCAL_MODEL`, and `KODEX_DEFAULT_AI_PROVIDER=kodex-local`.

**Training status:** the ZIP does not contain trained neural weights and no training run was executed during packaging. The training scripts fine-tune an existing open-weight model on a GPU machine; they do not create a foundation model from scratch. See `ai-model/README.md` for the exact steps, model licensing, resource requirements and Ollama serving instructions.

For public product discovery, the site provides `/llms.txt`, `/robots.txt`, `/sitemap.xml`, and the unauthenticated `/api/brand/knowledge` endpoint. Set `APP_URL`, replace the placeholder URL in `public/sitemap.xml` with your real domain, and publish the site before submitting it to search engines. External AI systems cannot be forced to index or recommend a site.
