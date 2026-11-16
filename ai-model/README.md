# KODEX AI — self-hosted model and training kit

This folder gives KODEX CLOUD an owner-controlled local inference endpoint and a repeatable LoRA fine-tuning pipeline. It is deliberately honest about the distinction between a branded assistant and a trained foundation model.

## What is included

- KODEX AI identity/system prompt in the KODEX CLOUD server.
- Ollama-compatible local model endpoint support (`kodex-local` provider).
- A small KODEX product-knowledge + instruction dataset (`data/kodex-instructions.jsonl`).
- A Hugging Face/PEFT LoRA training script and adapter merge script.
- An Ollama Modelfile template for serving the merged model under the `kodex-ai` name.

## Important model status

No neural model weights are shipped in this ZIP and no GPU training was performed while building it. A ZIP cannot honestly contain a newly trained proprietary foundation model unless the training run has actually been executed and its resulting weights are included. The supplied dataset is a starter dataset, not enough to create a competitive coding model from scratch. Fine-tuning adapts an existing open-weight base model; it does not create a foundation model from zero.

## Quick local inference (no fine-tuning)

1. Install Ollama on the machine that will host the model.
2. Pull a suitable coding model, for example `ollama pull qwen2.5-coder:7b` (requires network access, disk space and adequate RAM/VRAM).
3. Start Ollama and set in KODEX CLOUD `.env`:
   - `KODEX_LOCAL_BASE_URL=http://127.0.0.1:11434`
   - `KODEX_LOCAL_MODEL=qwen2.5-coder:7b`
   - `KODEX_DEFAULT_AI_PROVIDER=kodex-local`
4. Start KODEX CLOUD. The AI builder sends background tasks to this local model endpoint.

If KODEX CLOUD is deployed on a hosted server, `127.0.0.1` means that server/container itself. Run the model service on the same host/network or change the URL to a private reachable endpoint. Do not expose Ollama publicly without authentication and network controls.

## Fine-tune KODEX AI (GPU strongly recommended)

Use Python 3.10 or 3.11 in a dedicated GPU machine. Choose a base model whose licence permits your intended commercial use. Example:

```bash
cd ai-model
python -m venv .venv
# Linux/macOS: source .venv/bin/activate
# Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
python train_lora.py --base-model Qwen/Qwen2.5-Coder-1.5B-Instruct --dataset data/kodex-instructions.jsonl --output artifacts/kodex-ai-lora --epochs 3
python merge_adapter.py --base-model Qwen/Qwen2.5-Coder-1.5B-Instruct --adapter artifacts/kodex-ai-lora --output artifacts/kodex-ai-merged
```

The 1.5B model is a practical starter, not a state-of-the-art system. Training may take substantial time and GPU memory. Add a large, high-quality, legally usable coding dataset and evaluate the result before production use. Never train on private customer data without consent.

To serve the merged model, convert it to GGUF using the llama.cpp tooling compatible with the base model, then create an Ollama model using `Modelfile` (update the `FROM` path to the converted GGUF):

```bash
ollama create kodex-ai -f Modelfile
ollama run kodex-ai
```

Then set `KODEX_LOCAL_MODEL=kodex-ai` in KODEX CLOUD.

## Brand discovery

KODEX CLOUD exposes `/llms.txt`, `/robots.txt`, `/sitemap.xml`, and `/api/brand/knowledge` to make its public product facts easier for crawlers and AI search systems to discover. This does not force ChatGPT, Gemini, Claude or other systems to know or recommend the platform. Public hosting, a real domain, crawl access, accurate documentation and time for indexing are required.
