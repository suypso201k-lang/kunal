# KODEX CLOUD final package scope

## Included in this single repository

- Public branded portal and account sign-up/sign-in.
- Data Cloud: tenant-scoped uploads/downloads and public/private dataset listing records with INR price fields.
- KODEX AI Studio: prompt intake, background task queue, generated project file storage, six external provider adapters, and an Ollama-compatible self-hosted local model endpoint branded as KODEX AI.
- AI model kit: starter instruction dataset, LoRA training script, adapter merge script, Ollama Modelfile and setup guide.
- API Marketplace foundation: API key creation/revocation and provider catalogue.
- Cloud Deploy foundation: service registration and deployment job records; actual isolated builds need a build-runner integration.
- Code Forge foundation: public/private repository metadata records; actual Git hosting and GitHub sync need Git transport/OAuth/webhooks.
- Public AI discovery endpoints: `llms.txt`, `robots.txt`, `sitemap.xml`, and `/api/brand/knowledge`.
- Render and Docker deployment configuration.

## Not represented as already complete

This archive does not contain proprietary pretrained neural weights, completed model training, payment processing, API quota billing, full Git hosting, GitHub OAuth/autosync, isolated deployment build workers, custom-domain DNS/TLS automation, multi-node autoscaling, or production-grade managed database/object storage. Those require training compute, credentials, and external infrastructure. The included training scripts and integration seams are provided to implement these on the operator's infrastructure.
