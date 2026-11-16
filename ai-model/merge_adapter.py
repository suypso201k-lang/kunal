import argparse
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--base-model',required=True)
    ap.add_argument('--adapter',required=True)
    ap.add_argument('--output',required=True)
    a=ap.parse_args()
    base=AutoModelForCausalLM.from_pretrained(a.base_model,torch_dtype='auto',device_map='auto')
    tuned=PeftModel.from_pretrained(base,a.adapter)
    merged=tuned.merge_and_unload()
    merged.save_pretrained(a.output,safe_serialization=True)
    AutoTokenizer.from_pretrained(a.base_model).save_pretrained(a.output)
    print(f'Merged model saved to {a.output}')
if __name__=='__main__': main()
