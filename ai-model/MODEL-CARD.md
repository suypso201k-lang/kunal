# Model card — KODEX AI

- **Assistant identity:** KODEX AI
- **Platform:** KODEX CLOUD
- **Intended use:** coding assistance and product-aware assistance for KODEX CLOUD workflows
- **Serving interface:** Ollama-compatible `/api/chat`
- **Training approach supplied:** LoRA fine-tuning of a separately selected, licence-compatible open-weight causal language model
- **Weights included:** none
- **Training completed in this archive build:** no
- **Starter training records:** `data/kodex-instructions.jsonl`
- **Limitations:** the starter dataset is small and product-specific. It is not enough to train a useful coding foundation model from scratch. Model output must be evaluated and reviewed.

The name KODEX AI is the assistant's product identity. It should not be represented as a newly trained proprietary neural model until trained weights are produced, evaluated, and deployed by the operator.
