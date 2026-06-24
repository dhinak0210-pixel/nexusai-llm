from datasets import load_dataset
import json
import random

print("Downloading dataset from Hugging Face...")
# Load a high quality cleaned instruction dataset
dataset = load_dataset("yahma/alpaca-cleaned", split="train")

print("Sampling 100 examples for fast training...")
sampled_dataset = dataset.shuffle(seed=42).select(range(100))

data = []
for item in sampled_dataset:
    data.append({
        "instruction": item["instruction"],
        "input": item.get("input", ""),
        "output": item["output"]
    })

with open("sample_data.json", "w") as f:
    json.dump(data, f, indent=2)

print(f"Successfully saved {len(data)} examples to sample_data.json!")
