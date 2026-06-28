import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
import sys

models = [
    "TinyLlama/TinyLlama-1.1B-Chat-v1.0",
    "microsoft/phi-2",
    "google/gemma-2-2b-it"
]

print("Device:", "cuda" if torch.cuda.is_available() else "cpu")

for m_id in models:
    print(f"\nTesting load for: {m_id}")
    try:
        tokenizer = AutoTokenizer.from_pretrained(m_id, local_files_only=True)
        print(f"✅ Tokenizer loaded from cache for {m_id}")
        
        model = AutoModelForCausalLM.from_pretrained(
            m_id,
            local_files_only=True,
            torch_dtype=torch.float32,
            low_cpu_mem_usage=True
        )
        print(f"✅ Model loaded from cache for {m_id}")
    except Exception as e:
        print(f"❌ Failed to load {m_id} locally: {e}")
