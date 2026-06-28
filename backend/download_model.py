import os
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch

model_id = "google/gemma-4-12B-it"
token = os.environ.get("HF_TOKEN") or None

print(f"Downloading {model_id}...")
print(f"Using HF token: {'yes' if token else 'no (public model)'}")

tokenizer = AutoTokenizer.from_pretrained(
    model_id,
    token=token,
    trust_remote_code=True
)
print("Tokenizer downloaded.")

model = AutoModelForCausalLM.from_pretrained(
    model_id,
    token=token,
    torch_dtype=torch.bfloat16,
    trust_remote_code=True,
    low_cpu_mem_usage=True,
)
print(f"Model downloaded successfully. Parameters: {sum(p.numel() for p in model.parameters())/1e6:.0f}M")
del model
print("Cache ready.")
