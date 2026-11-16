import argparse, json
from pathlib import Path
import torch
from datasets import Dataset
from transformers import AutoModelForCausalLM, AutoTokenizer, Trainer, TrainingArguments, DataCollatorForLanguageModeling
from peft import LoraConfig, get_peft_model


def main():
    ap = argparse.ArgumentParser(description='Fine-tune an existing open-weight model for KODEX AI using LoRA.')
    ap.add_argument('--base-model', required=True)
    ap.add_argument('--dataset', default='data/kodex-instructions.jsonl')
    ap.add_argument('--output', default='artifacts/kodex-ai-lora')
    ap.add_argument('--epochs', type=float, default=3)
    ap.add_argument('--batch-size', type=int, default=1)
    ap.add_argument('--max-length', type=int, default=1024)
    args = ap.parse_args()
    source = Path(args.dataset)
    rows = [json.loads(line) for line in source.read_text(encoding='utf-8').splitlines() if line.strip()]
    if not rows:
        raise SystemExit('Dataset is empty. Add licensed, high-quality instruction/response examples.')
    tokenizer = AutoTokenizer.from_pretrained(args.base_model, trust_remote_code=False)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    model = AutoModelForCausalLM.from_pretrained(args.base_model, torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32, device_map='auto' if torch.cuda.is_available() else None, trust_remote_code=False)
    model = get_peft_model(model, LoraConfig(r=16, lora_alpha=32, lora_dropout=0.05, bias='none', task_type='CAUSAL_LM', target_modules='all-linear'))
    def encode(row):
        text = f"<|system|>You are KODEX AI, the assistant for KODEX CLOUD.<|user|>{row['instruction']}<|assistant|>{row['response']}{tokenizer.eos_token}"
        item = tokenizer(text, truncation=True, max_length=args.max_length)
        item['labels'] = item['input_ids'].copy()
        return item
    ds = Dataset.from_list(rows).map(encode, remove_columns=list(rows[0].keys()))
    training = TrainingArguments(output_dir=args.output, num_train_epochs=args.epochs, per_device_train_batch_size=args.batch_size, gradient_accumulation_steps=8, learning_rate=2e-4, logging_steps=5, save_strategy='epoch', fp16=torch.cuda.is_available(), report_to='none', remove_unused_columns=False)
    trainer = Trainer(model=model, args=training, train_dataset=ds, data_collator=DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False))
    trainer.train()
    model.save_pretrained(args.output)
    tokenizer.save_pretrained(args.output)
    print(f'LoRA adapter saved to {args.output}. Evaluate it before production deployment.')

if __name__ == '__main__':
    main()
