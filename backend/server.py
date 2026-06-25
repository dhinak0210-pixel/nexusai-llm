"""
NexusAI — Multi-Model LLM Backend Server
==========================================
FastAPI server that hosts multiple free HuggingFace models with streaming.
Supports hot-swapping models via API. Run locally or on Google Colab.

Usage:
  pip install -r requirements.txt
  python server.py
  python server.py --model "microsoft/phi-2"
  python server.py --model "HuggingFaceTB/SmolLM2-1.7B-Instruct"
"""
import os
import argparse
import asyncio
import gc
import json
import time
import uuid
from threading import Thread
from typing import Optional

import torch
import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from transformers import AutoModelForCausalLM, AutoTokenizer, TextIteratorStreamer
import requests as http_requests

# Auto-inject Hugging Face token from local cache if not set in environment
if not os.environ.get("HF_TOKEN"):
    token_path = os.path.expanduser("~/.cache/huggingface/token")
    if os.path.exists(token_path):
        try:
            with open(token_path, "r") as f:
                os.environ["HF_TOKEN"] = f.read().strip()
                print("🔑 Loaded Hugging Face token from cache")
        except Exception as e:
            print(f"⚠️ Failed to read Hugging Face token from cache: {e}")

# ============================================
# Available Free Models Registry
# ============================================
MODEL_REGISTRY = {
    "./fine_tuned_lora": {
        "id": "./fine_tuned_lora",
        "name": "Custom Fine-Tuned Model",
        "size": "Custom",
        "quality": 5,
        "vram": "Depends",
        "description": "Your custom local instruction-aligned model (saved in ./fine_tuned_lora)",
        "chat_capable": True,
    },
    "HuggingFaceTB/SmolLM2-1.7B-Instruct": {
        "id": "HuggingFaceTB/SmolLM2-1.7B-Instruct",
        "name": "SmolLM2 1.7B",
        "size": "1.7B",
        "quality": 4,
        "vram": "~4 GB",
        "description": "Fast, open-access HuggingFace model — great for local inference.",
        "chat_capable": True,
    },
    "microsoft/Phi-3-mini-4k-instruct": {
        "id": "microsoft/Phi-3-mini-4k-instruct",
        "name": "Phi-3 Mini",
        "size": "3.8B",
        "quality": 4,
        "vram": "~7 GB",
        "description": "Microsoft's compact powerhouse — strong reasoning in a small footprint.",
        "chat_capable": True,
    },

}

DEFAULT_MODEL = "./fine_tuned_lora"

# ============================================
# App Setup
# ============================================
app = FastAPI(title="NexusAI Multi-Model LLM Server", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# Global Model State
# ============================================
current_model_id = None
model = None
tokenizer = None
model_loaded = False
is_loading = False
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"


def unload_model():
    """Free the current model from memory."""
    global model, tokenizer, model_loaded, current_model_id
    if model is not None:
        del model
        del tokenizer
        model = None
        tokenizer = None
        model_loaded = False
        current_model_id = None
        gc.collect()
        if DEVICE == "cuda":
            torch.cuda.empty_cache()
        print("🗑️  Previous model unloaded from memory")


def load_model(model_id: str):
    """Load a model and tokenizer into memory."""
    global model, tokenizer, model_loaded, current_model_id, is_loading

    if current_model_id == model_id and model_loaded:
        print(f"✅ Model {model_id} is already loaded")
        return

    is_loading = True

    try:
        # Unload previous model first
        if model_loaded:
            unload_model()

        print(f"\n{'='*50}")
        print(f"🔄 Loading model: {model_id}")
        print(f"📍 Device: {DEVICE}")
        print(f"{'='*50}")

        import os
        is_lora = False
        base_model_id = model_id
        
        if os.path.exists(os.path.join(model_id, "adapter_config.json")):
            is_lora = True
            try:
                with open(os.path.join(model_id, "adapter_config.json"), "r") as f:
                    config_data = json.load(f)
                    base_model_id = config_data.get("base_model_name_or_path", "TinyLlama/TinyLlama-1.1B-Chat-v1.0")
            except Exception:
                base_model_id = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"

        tokenizer = AutoTokenizer.from_pretrained(base_model_id, trust_remote_code=True)

        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token

        load_kwargs = {
            "trust_remote_code": True,
        }

        if DEVICE == "cuda":
            load_kwargs["torch_dtype"] = torch.float16
            load_kwargs["device_map"] = "auto"
        else:
            load_kwargs["torch_dtype"] = torch.bfloat16

        # Load base model first
        print(f"📦 Loading base model: {base_model_id}")
        model = AutoModelForCausalLM.from_pretrained(base_model_id, **load_kwargs)

        # Load and merge PEFT adapter if LoRA
        if is_lora:
            print(f"🧬 Loading LoRA adapter weights from: {model_id}")
            try:
                from peft import PeftModel
                model = PeftModel.from_pretrained(model, model_id)
                print("🔄 Merging LoRA adapters into base model for fast inference...")
                model = model.merge_and_unload()
            except Exception as e:
                print(f"⚠️ Failed to load/merge Peft adapter: {e}. Running base model directly.")

        if DEVICE == "cpu":
            model = model.to(DEVICE)

        model.eval()
        current_model_id = model_id
        model_loaded = True

        param_count = sum(p.numel() for p in model.parameters()) / 1e6
        print(f"✅ Model loaded successfully!")
        print(f"📊 Parameters: {param_count:.0f}M")

        if DEVICE == "cuda":
            mem = torch.cuda.memory_allocated() / 1e9
            print(f"💾 GPU Memory used: {mem:.1f} GB")
    finally:
        is_loading = False


# ============================================
# Request/Response Models
# ============================================
class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    model: Optional[str] = None
    messages: list[Message]
    max_tokens: Optional[int] = 1024
    temperature: Optional[float] = 0.7
    top_p: Optional[float] = 0.95
    stream: Optional[bool] = True


class LoadModelRequest(BaseModel):
    model_id: str


# ============================================
# Chat Prompt Formatting
# ============================================
def format_chat_prompt(messages: list[Message]) -> str:
    """Format messages using the model's chat template or fallback."""
    info = MODEL_REGISTRY.get(current_model_id, {})
    formatted = [{"role": m.role, "content": m.content} for m in messages]

    if current_model_id == "./fine_tuned_lora":
        try:
            with open("claude_system_prompt.md", "r") as f:
                system_prompt = f.read()
        except FileNotFoundError:
            system_prompt = "You are a highly capable, premium ChatGPT-level assistant. You answer questions thoroughly, accurately, and politely."
        text = f"<|system|>\n{system_prompt}</s>\n"
        for msg in messages:
            if msg.role == "system":
                continue
            text += f"<|{msg.role}|>\n{msg.content}</s>\n"
        text += "<|assistant|>\n"
        print(f"\n--- DEBUG: Custom Model Formatted Prompt ---\n{text}\n-------------------------------------------\n")
        return text

    # Try built-in chat template first (works for chat models)
    if info.get("chat_capable", True):
        try:
            res = tokenizer.apply_chat_template(
                formatted, tokenize=False, add_generation_prompt=True
            )
            print(f"\n--- DEBUG: Formatted Prompt (Template) ---\n{res}\n-------------------------------------------\n")
            return res
        except Exception:
            pass

    # Fallback for non-chat models (GPT-2 family)
    parts = []
    for msg in formatted:
        if msg["role"] == "system":
            parts.append(f"System: {msg['content']}\n")
        elif msg["role"] == "user":
            parts.append(f"Human: {msg['content']}\n")
        elif msg["role"] == "assistant":
            parts.append(f"Assistant: {msg['content']}\n")
    parts.append("Assistant:")
    res = "\n".join(parts)
    print(f"\n--- DEBUG: Formatted Prompt (Fallback) ---\n{res}\n-------------------------------------------\n")
    return res


# ============================================
# Streaming Generator
# ============================================
async def stream_generate(request: ChatRequest):
    """Generate tokens with SSE streaming (OpenAI-compatible format)."""
    prompt = format_chat_prompt(request.messages)

    inputs = tokenizer(
        prompt, return_tensors="pt", truncation=True, max_length=2048
    )
    inputs = {k: v.to(model.device) for k, v in inputs.items()}

    streamer = TextIteratorStreamer(
        tokenizer, skip_prompt=True, skip_special_tokens=True
    )

    generation_kwargs = {
        **inputs,
        "max_new_tokens": request.max_tokens,
        "temperature": max(request.temperature, 0.01),
        "top_p": request.top_p,
        "do_sample": True,
        "streamer": streamer,
        "pad_token_id": tokenizer.pad_token_id,
        "eos_token_id": tokenizer.eos_token_id,
        "stop_strings": ["<|im_end|>", "</s>", "<|user|>", "<|assistant|>"],
        "tokenizer": tokenizer,
    }

    thread = Thread(target=model.generate, kwargs=generation_kwargs)
    thread.start()

    response_id = f"chatcmpl-{uuid.uuid4().hex[:8]}"

    accumulated_text = ""
    sent_len = 0
    
    for token_text in streamer:
        accumulated_text += token_text
        
        # Check for stop strings
        stop_found = False
        stop_str_found = ""
        for stop_str in ["<|im_end|>", "</s>", "<|user|>", "<|assistant|>", "System:", "Human:", "Assistant:"]:
            if stop_str in accumulated_text:
                stop_found = True
                stop_str_found = stop_str
                break
                
        if stop_found:
            # Send everything up to the stop string
            stop_idx = accumulated_text.find(stop_str_found)
            final_text = accumulated_text[sent_len:stop_idx]
            if final_text:
                chunk = {
                    "id": response_id,
                    "object": "chat.completion.chunk",
                    "created": int(time.time()),
                    "model": current_model_id,
                    "choices": [
                        {
                            "index": 0,
                            "delta": {"content": final_text},
                            "finish_reason": "stop",
                        }
                    ],
                }
                yield f"data: {json.dumps(chunk)}\n\n"
            break
            
        # Send new tokens
        new_text = accumulated_text[sent_len:]
        if new_text:
            sent_len = len(accumulated_text)
            chunk = {
                "id": response_id,
                "object": "chat.completion.chunk",
                "created": int(time.time()),
                "model": current_model_id,
                "choices": [
                    {
                        "index": 0,
                        "delta": {"content": new_text},
                        "finish_reason": None,
                    }
                ],
            }
            yield f"data: {json.dumps(chunk)}\n\n"
            await asyncio.sleep(0)

    final_chunk = {
        "id": response_id,
        "object": "chat.completion.chunk",
        "created": int(time.time()),
        "model": current_model_id,
        "choices": [{"index": 0, "delta": {}, "finish_reason": "stop"}],
    }
    yield f"data: {json.dumps(final_chunk)}\n\n"
    yield "data: [DONE]\n\n"

    thread.join()


# ============================================
# API Endpoints
# ============================================
# Serve frontend static assets (only if dist folder exists)
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "dist"))

@app.get("/")
async def root():
    index_path = os.path.join(frontend_dist, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {
        "service": "NexusAI Multi-Model LLM Server",
        "current_model": current_model_id,
        "device": DEVICE,
        "status": "ready" if model_loaded else ("loading" if is_loading else "idle"),
        "gpu_available": torch.cuda.is_available(),
        "gpu_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
    }


@app.get("/v1/config")
async def get_config():
    """Return runtime configuration for the frontend."""
    hf_token = os.environ.get("HF_TOKEN", "")
    return {
        "hf_token_available": bool(hf_token),
        "proxy_available": True,
        "device": DEVICE,
    }


@app.post("/v1/hf/chat/completions")
async def proxy_hf_chat(request: Request):
    """Proxy cloud model requests to HuggingFace using server-side HF_TOKEN.
    This keeps the API key securely on the server — never exposed to the browser.
    """
    hf_token = os.environ.get("HF_TOKEN", "")
    if not hf_token:
        raise HTTPException(
            status_code=401,
            detail="HF_TOKEN not configured on this server. Set it in Space secrets."
        )

    body = await request.json()
    is_stream = body.get("stream", True)

    hf_url = "https://router.huggingface.co/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {hf_token}",
        "Content-Type": "application/json",
    }

    if is_stream:
        def generate_proxy():
            try:
                with http_requests.post(
                    hf_url, json=body, headers=headers, stream=True, timeout=120
                ) as resp:
                    for chunk in resp.iter_content(chunk_size=None):
                        if chunk:
                            yield chunk
            except Exception as e:
                error_msg = f'data: {{"error": "{str(e)}"}}'  
                yield error_msg.encode()

        return StreamingResponse(
            generate_proxy(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
            }
        )
    else:
        resp = http_requests.post(hf_url, json=body, headers=headers, timeout=120)
        return resp.json()


@app.get("/v1/models")
async def list_models():
    """List all available models with metadata."""
    models = []
    for mid, info in MODEL_REGISTRY.items():
        models.append(
            {
                "id": mid,
                "object": "model",
                "owned_by": "local",
                "name": info["name"],
                "size": info["size"],
                "quality": info["quality"],
                "vram": info["vram"],
                "description": info["description"],
                "chat_capable": info["chat_capable"],
                "loaded": mid == current_model_id,
            }
        )
    return {"object": "list", "data": models}


@app.post("/v1/models/load")
async def load_model_endpoint(request: LoadModelRequest):
    """Hot-swap to a different model."""
    if request.model_id not in MODEL_REGISTRY:
        available = list(MODEL_REGISTRY.keys())
        raise HTTPException(
            400, f"Unknown model: {request.model_id}. Available: {available}"
        )

    if is_loading:
        raise HTTPException(409, "A model is already being loaded. Please wait.")

    try:
        load_model(request.model_id)
        return {
            "status": "loaded",
            "model": request.model_id,
            "name": MODEL_REGISTRY[request.model_id]["name"],
        }
    except Exception as e:
        raise HTTPException(500, f"Failed to load model: {str(e)}")


@app.post("/v1/chat/completions")
async def chat_completions(request: ChatRequest):
    """OpenAI-compatible chat completions endpoint with streaming."""
    if is_loading:
        raise HTTPException(503, "Model is loading... please wait.")
    if not model_loaded:
        raise HTTPException(503, "No model loaded. POST /v1/models/load first.")

    if not request.messages:
        raise HTTPException(400, "Messages list cannot be empty.")

    # If a different model is requested, hot-swap
    if request.model and request.model != current_model_id:
        if request.model in MODEL_REGISTRY:
            load_model(request.model)

    if request.stream:
        return StreamingResponse(
            stream_generate(request),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )
    else:
        prompt = format_chat_prompt(request.messages)
        inputs = tokenizer(
            prompt, return_tensors="pt", truncation=True, max_length=2048
        )
        inputs = {k: v.to(model.device) for k, v in inputs.items()}

        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=request.max_tokens,
                temperature=max(request.temperature, 0.01),
                top_p=request.top_p,
                do_sample=True,
                pad_token_id=tokenizer.pad_token_id,
                eos_token_id=tokenizer.eos_token_id,
                stop_strings=["<|im_end|>", "</s>", "<|user|>", "<|assistant|>"],
                tokenizer=tokenizer,
            )

        generated = outputs[0][inputs["input_ids"].shape[1] :]
        text = tokenizer.decode(generated, skip_special_tokens=True)
        text = text.replace("<|im_end|>", "").replace("</s>", "").replace("<|user|>", "").replace("<|assistant|>", "").strip()

        return {
            "id": f"chatcmpl-{uuid.uuid4().hex[:8]}",
            "object": "chat.completion",
            "created": int(time.time()),
            "model": current_model_id,
            "choices": [
                {
                    "index": 0,
                    "message": {"role": "assistant", "content": text},
                    "finish_reason": "stop",
                }
            ],
        }


if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/{fallback_path:path}")
    async def serve_frontend(fallback_path: str):
        if fallback_path.startswith(("v1/", "docs", "redoc", "openapi.json")):
            raise HTTPException(status_code=404)
        index_path = os.path.join(frontend_dist, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        raise HTTPException(status_code=404)


# ============================================
# Startup
# ============================================
def main():
    parser = argparse.ArgumentParser(description="NexusAI Multi-Model LLM Server")
    parser.add_argument(
        "--model",
        default=DEFAULT_MODEL,
        help=f"Model to load on startup (default: {DEFAULT_MODEL})",
    )
    parser.add_argument("--port", type=int, default=8000, help="Server port")
    parser.add_argument("--host", default="0.0.0.0", help="Server host")
    parser.add_argument("--skip-model", action="store_true",
                        help="Skip loading the local model (cloud-only mode)")
    args = parser.parse_args()

    print(f"\n🚀 Server starting on http://{args.host}:{args.port}")
    print(f"📡 API docs: http://{args.host}:{args.port}/docs\n")

    if not args.skip_model:
        # Load model in background thread so server starts instantly
        def _bg_load():
            try:
                load_model(args.model)
            except Exception as e:
                print(f"⚠️ Background model load failed: {e}")
                print("☁️ Cloud models still work via /v1/hf/chat/completions proxy.")

        bg_thread = Thread(target=_bg_load, daemon=True)
        bg_thread.start()
        print("⏳ Local model loading in background — cloud models available immediately!")
    else:
        print("☁️ Cloud-only mode — no local model loaded")

    uvicorn.run(app, host=args.host, port=args.port)


if __name__ == "__main__":
    main()
