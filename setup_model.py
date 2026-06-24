#!/usr/bin/env python3
"""
NexusAI Standalone — Pre-trained Model Downloader
=================================================
Pre-downloads and verifies free pre-trained models from HuggingFace
to ensure they are cached locally for the chat application.

Usage:
  python3 setup_model.py --model tinyllama
  python3 setup_model.py --model phi2
"""

import argparse
import sys
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM

MODELS = {
    "tinyllama": "TinyLlama/TinyLlama-1.1B-Chat-v1.0",
    "phi2": "microsoft/phi-2",
    "llama3": "meta-llama/Llama-3.2-1B-Instruct",
    "mistral": "mistralai/Mistral-7B-Instruct-v0.3",
    "gemma": "google/gemma-2-2b-it",
}

def main():
    parser = argparse.ArgumentParser(description="Download free pre-trained LLMs from HuggingFace")
    parser.add_argument(
        "--model",
        choices=["tinyllama", "phi2", "llama3", "mistral", "gemma"],
        default="tinyllama",
        help="Select the model to download (default: tinyllama)"
    )
    args = parser.parse_args()

    model_id = MODELS[args.model]
    print("=" * 60)
    print(f"📥 Starting download for pre-trained model: {args.model.upper()}")
    print(f"🔗 HuggingFace Repository: {model_id}")
    print("=" * 60)

    try:
        print("1. Downloading tokenizer...")
        tokenizer = AutoTokenizer.from_pretrained(model_id, trust_remote_code=True)
        print("✅ Tokenizer downloaded.")

        print("\n2. Downloading model weights (this might take a while)...")
        # Load weights on CPU using float32 to verify/cache
        model = AutoModelForCausalLM.from_pretrained(
            model_id,
            torch_dtype=torch.float32,
            low_cpu_mem_usage=True,
            trust_remote_code=True
        )
        print("✅ Model weights downloaded and cached.")

        print("\n3. Testing model loading and output...")
        inputs = tokenizer("Hello! I am a pre-trained", return_tensors="pt")
        outputs = model.generate(**inputs, max_new_tokens=10)
        decoded = tokenizer.decode(outputs[0], skip_special_tokens=True)
        print(f"   Test prompt output: \"{decoded}...\"")

        print("\n" + "=" * 60)
        print(f"🎉 SUCCESS: {args.model.upper()} is cached and ready to use locally!")
        print(f"👉 Next, start the chat server: python3 chat_app.py --model {args.model}")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ Error downloading model: {e}")
        print("💡 Make sure you have a working internet connection and enough disk space.")
        sys.exit(1)

if __name__ == "__main__":
    main()
