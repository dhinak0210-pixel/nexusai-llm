#!/usr/bin/env python3
"""
NexusAI Fine-Tuning Engine — LoRA & QLoRA training script
==========================================================
Enables local instruction tuning of open-weights LLMs to elevate them
to ChatGPT-level conversational capability on consumer hardware.

Features:
  - 4-bit / 8-bit QLoRA quantization (low memory/low VRAM)
  - Full SFTTrainer integration with PEFT (LoRA parameters)
  - Configurable learning rate, batch size, and weight decay
  - Custom dataset formatting and tokenization
  - Automatic model merging and saving

Requirements:
  pip install torch transformers peft trl datasets bitsandbytes accelerate
"""

import os
import sys
import argparse
import torch
from datasets import load_dataset
from transformers import (
    AutoTokenizer,
    AutoModelForCausalLM,
    TrainingArguments,
    BitsAndBytesConfig,
    DataCollatorForLanguageModeling
)
from peft import (
    LoraConfig,
    get_peft_model,
    prepare_model_for_kbit_training,
    TaskType
)
from trl import SFTTrainer

# System prompt to align the fine-tuned model's persona
try:
    with open("claude_system_prompt.md", "r") as f:
        SYSTEM_ALIGNMENT = f.read().strip()
except FileNotFoundError:
    SYSTEM_ALIGNMENT = "You are a highly capable, premium ChatGPT-level assistant. You answer questions thoroughly, accurately, and politely."

def print_banner():
    print("\n" + "=" * 70)
    print("🔥 NexusAI LLM Fine-Tuning Engine: ChatGPT-Level Instruction Alignment")
    print("=" * 70)

def main():
    print_banner()

    parser = argparse.ArgumentParser(description="Fine-tune open-weights LLMs locally using LoRA/QLoRA")
    parser.add_argument(
        "--model",
        default="meta-llama/Llama-3.2-1B-Instruct",
        help="Base model ID from HuggingFace (default: Llama 3.2 1B)"
    )
    parser.add_argument(
        "--dataset",
        default="sample_data.json",
        help="Path to training dataset JSON file (Alpaca / Instruction format)"
    )
    parser.add_argument(
        "--output_dir",
        default="./fine_tuned_lora",
        help="Directory to save fine-tuned checkpoints and adapters"
    )
    parser.add_argument(
        "--epochs",
        type=int,
        default=3,
        help="Number of training epochs"
    )
    parser.add_argument(
        "--batch_size",
        type=int,
        default=2,
        help="Training batch size per device (increase if VRAM allows)"
    )
    parser.add_argument(
        "--lr",
        type=float,
        default=2e-4,
        help="Learning rate for optimization"
    )
    parser.add_argument(
        "--quantize",
        choices=["none", "8bit", "4bit"],
        default="4bit",
        help="Quantization level to save GPU VRAM (default: 4bit)"
    )
    parser.add_argument(
        "--merge",
        action="store_true",
        help="Merge LoRA weights back to base model after training"
    )
    args = parser.parse_args()

    # Determine device availability
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"📍 Device detected: {device.upper()}")
    if device == "cpu" and args.quantize != "none":
        print("⚠️ Quantization requires CUDA. Disabling quantization for CPU-based training.")
        args.quantize = "none"

    # 1. Load Dataset
    print(f"\n📂 Loading dataset from: {args.dataset}")
    if not os.path.exists(args.dataset):
        print(f"❌ Dataset file '{args.dataset}' not found. Please create it or provide a valid path.")
        sys.exit(1)

    try:
        dataset = load_dataset("json", data_files=args.dataset, split="train")
        print(f"📊 Dataset loaded: {len(dataset)} examples found.")
    except Exception as e:
        print(f"❌ Failed to load dataset: {e}")
        sys.exit(1)

    # Define instruction formatting function (TinyLlama/Lora format aligned with chat_template.jinja)
    def formatting_prompts_func(example):
        inst = example['instruction']
        inp = example.get('input', '')
        if isinstance(inp, list):
            inp = inp[0] if len(inp) > 0 else ''
        out = example['output']
        if isinstance(out, list):
            out = out[0] if len(out) > 0 else ''
        if isinstance(inst, list):
            inst = inst[0] if len(inst) > 0 else ''
        
        # Combine instruction and input
        user_msg = f"{inst}\n{inp}".strip() if inp else inst
        
        # Format using standard chat/instruction templates matching chat_template.jinja
        text = f"<|system|>\n{SYSTEM_ALIGNMENT}</s>\n"
        text += f"<|user|>\n{user_msg}</s>\n"
        text += f"<|assistant|>\n{out}</s>"
        return text

    # 2. Configure Quantization (QLoRA)
    bnb_config = None
    if args.quantize == "4bit":
        print("💾 Configuring 4-bit QLoRA Quantization...")
        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_use_double_quant=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.float16 if device == "cuda" else torch.float32
        )
    elif args.quantize == "8bit":
        print("💾 Configuring 8-bit QLoRA Quantization...")
        bnb_config = BitsAndBytesConfig(
            load_in_8bit=True
        )

    # 3. Load Tokenizer & Base Model
    print(f"\n📥 Loading base model: {args.model}")
    try:
        tokenizer = AutoTokenizer.from_pretrained(args.model, trust_remote_code=True)
        tokenizer.pad_token = tokenizer.eos_token
        tokenizer.padding_side = "right" # Fixed for decoder models
        
        load_kwargs = {
            "trust_remote_code": True,
            "quantization_config": bnb_config,
        }
        if device == "cuda":
            load_kwargs["device_map"] = "auto"
            if args.quantize == "none":
                load_kwargs["torch_dtype"] = torch.float16
        else:
            load_kwargs["torch_dtype"] = torch.float32

        model = AutoModelForCausalLM.from_pretrained(args.model, **load_kwargs)
        print("✅ Base model loaded successfully!")
    except Exception as e:
        print(f"❌ Error loading model: {e}")
        sys.exit(1)

    # 4. Set up PEFT (LoRA Config)
    print("\n🧬 Configuring LoRA/PEFT Adapter Parameters...")
    if args.quantize != "none":
        model = prepare_model_for_kbit_training(model)

    # Target layers commonly updated in causal models
    target_modules = ["q_proj", "v_proj", "k_proj", "o_proj", "gate_proj", "up_proj", "down_proj"]
    
    lora_config = LoraConfig(
        r=16,                       # Rank
        lora_alpha=32,              # Alpha scaling
        target_modules=target_modules,
        lora_dropout=0.05,
        bias="none",
        task_type=TaskType.CAUSAL_LM
    )

    # 5. SFT Configuration
    try:
        from trl import SFTConfig
        print("⚙️ Using SFTConfig (trl >= 0.8.0)...")
        training_args = SFTConfig(
            output_dir=args.output_dir,
            num_train_epochs=args.epochs,
            per_device_train_batch_size=args.batch_size,
            gradient_accumulation_steps=4,
            optim="adamw_torch" if device == "cpu" else "paged_adamw_32bit",
            save_strategy="epoch",
            learning_rate=args.lr,
            fp16=(device == "cuda" and args.quantize == "none"),
            bf16=False,
            max_grad_norm=0.3,
            warmup_ratio=0.03,
            group_by_length=True,
            lr_scheduler_type="cosine",
            logging_steps=10,
            report_to="none",
            max_length=512
        )
        sft_trainer_kwargs = {}
    except ImportError:
        print("⚙️ Using classic TrainingArguments (trl < 0.8.0)...")
        training_args = TrainingArguments(
            output_dir=args.output_dir,
            num_train_epochs=args.epochs,
            per_device_train_batch_size=args.batch_size,
            gradient_accumulation_steps=4,
            optim="adamw_torch" if device == "cpu" else "paged_adamw_32bit",
            save_strategy="epoch",
            learning_rate=args.lr,
            fp16=(device == "cuda" and args.quantize == "none"),
            bf16=False,
            max_grad_norm=0.3,
            warmup_ratio=0.03,
            group_by_length=True,
            lr_scheduler_type="cosine",
            logging_steps=10,
            report_to="none"
        )
        sft_trainer_kwargs = {"max_seq_length": 512}

    # 6. SFTTrainer Setup
    print("\n🚀 Initializing SFT Trainer...")
    import inspect
    sig = inspect.signature(SFTTrainer.__init__)
    trainer_kwargs = {
        "model": model,
        "train_dataset": dataset,
        "peft_config": lora_config,
        "formatting_func": formatting_prompts_func,
        "args": training_args,
        "data_collator": DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False),
    }
    if "processing_class" in sig.parameters:
        trainer_kwargs["processing_class"] = tokenizer
    else:
        trainer_kwargs["tokenizer"] = tokenizer

    trainer = SFTTrainer(
        **trainer_kwargs,
        **sft_trainer_kwargs
    )

    # 7. Start Training
    print("\n🏋️ Starting Fine-Tuning Loop...")
    try:
        trainer.train()
        print("\n🎉 Training completed successfully!")
    except Exception as e:
        print(f"❌ Error occurred during training: {e}")
        sys.exit(1)

    # 8. Save Model Adapters
    print(f"💾 Saving LoRA adapter checkpoints to: {args.output_dir}")
    trainer.model.save_pretrained(args.output_dir)
    tokenizer.save_pretrained(args.output_dir)
    print("✅ Adapters and tokenizer saved.")

    # 9. Merge weights if requested
    if args.merge:
        if args.quantize != "none":
            print("\n⚠️ Cannot merge LoRA weights directly from a quantized 4/8-bit model.")
            print("To merge, run training with `--quantize none` or merge offline using fp16 weights.")
        else:
            print("\n🔄 Merging LoRA weights back into base model...")
            try:
                from peft import PeftModel
                base_model = AutoModelForCausalLM.from_pretrained(
                    args.model,
                    torch_dtype=torch.float16 if device == "cuda" else torch.float32,
                    device_map="auto" if device == "cuda" else None
                )
                peft_model = PeftModel.from_pretrained(base_model, args.output_dir)
                merged_model = peft_model.merge_and_unload()
                
                merged_output_dir = os.path.join(args.output_dir, "merged_model")
                print(f"💾 Saving complete merged model to: {merged_output_dir}")
                merged_model.save_pretrained(merged_output_dir)
                tokenizer.save_pretrained(merged_output_dir)
                print("✅ Merged model successfully saved!")
            except Exception as e:
                print(f"❌ Failed to merge weights: {e}")

    print("\n" + "=" * 70)
    print("🎉 NexusAI LLM Fine-Tuning Pipeline Complete!")
    print(f"👉 You can load this model in server.py by passing --model {args.output_dir}")
    print("=" * 70 + "\n")

if __name__ == "__main__":
    main()
