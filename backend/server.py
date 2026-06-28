"""
NexusAI — Multi-Model LLM Backend Server
==========================================
FastAPI server that hosts multiple free HuggingFace models with streaming.
Supports hot-swapping models via API. Run locally or on Google Colab.

Usage:
  pip install -r requirements.txt
  python server.py
  python server.py --model "microsoft/phi-2"
  python server.py --model "google/gemma-2-2b-it"
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
}

DEFAULT_MODEL = "./fine_tuned_lora"

# Model download status tracking
download_status = {}  # model_id -> {"status": "idle"|"downloading"|"completed"|"failed", "error": None}

def download_model_in_background(model_id: str):
    global download_status
    download_status[model_id] = {"status": "downloading", "error": None}
    try:
        print(f"📥 Starting background download of tokenizer for {model_id}...")
        tokenizer = AutoTokenizer.from_pretrained(model_id, trust_remote_code=True)
        print(f"📥 Starting background download of weights for {model_id}...")
        model = AutoModelForCausalLM.from_pretrained(
            model_id,
            torch_dtype=torch.float32,
            low_cpu_mem_usage=True,
            trust_remote_code=True,
        )
        del model
        del tokenizer
        gc.collect()
        download_status[model_id] = {"status": "completed", "error": None}
        print(f"✅ Background download of {model_id} completed and cached successfully!")
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Background download of {model_id} failed: {error_msg}")
        download_status[model_id] = {"status": "failed", "error": error_msg}


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

    # Verify that the model is fully downloaded before attempting to load
    cached_repos = set()
    try:
        from huggingface_hub import scan_cache_dir
        cache_info = scan_cache_dir()
        for repo in cache_info.repos:
            cached_repos.add(repo.repo_id)
    except Exception:
        pass

    if not is_model_fully_downloaded(model_id, cached_repos):
        raise ValueError(f"Model '{model_id}' is not fully downloaded yet. Please wait until download completes.")

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
            "low_cpu_mem_usage": True,
        }

        if DEVICE == "cuda":
            load_kwargs["torch_dtype"] = torch.float16
            load_kwargs["device_map"] = "auto"
        else:
            load_kwargs["torch_dtype"] = torch.bfloat16
            load_kwargs["device_map"] = "auto"
            load_kwargs["offload_folder"] = "offload_cache"

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

        if DEVICE == "cpu" and "device_map" not in load_kwargs:
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
        "repetition_penalty": 1.15,
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
    
    import queue
    while True:
        try:
            token_text = streamer.text_queue.get_nowait()
            if token_text is None:
                break
        except queue.Empty:
            if not thread.is_alive():
                # Double-check the queue one last time in case items arrived as the thread was exiting
                try:
                    token_text = streamer.text_queue.get_nowait()
                    if token_text is None:
                        break
                except queue.Empty:
                    break
            await asyncio.sleep(0.01)
            continue

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


@app.get("/v1/status")
async def get_status():
    """Return server status details."""
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
    return {
        "hf_token_available": False,
        "proxy_available": False,
        "device": DEVICE,
    }


@app.post("/v1/hf/chat/completions")
async def proxy_hf_chat(request: Request):
    """Proxy cloud model requests to HuggingFace. Disabled to prevent HF token usage."""
    raise HTTPException(
        status_code=403,
        detail="Hugging Face cloud proxy is disabled. Use local models instead."
    )


def is_downloader_running():
    try:
        import psutil
        for proc in psutil.process_iter(['cmdline']):
            cmd = proc.info.get('cmdline')
            if cmd and any('aria_download_wrapper.py' in part for part in cmd):
                return True
    except Exception:
        try:
            import subprocess
            out = subprocess.check_output(["ps", "aux"])
            if b"aria_download_wrapper.py" in out:
                return True
        except Exception:
            pass
    return False

def get_download_progress():
    log_path = os.path.expanduser("~/.cache/huggingface/hub/models--google--gemma-4-12B-it/blobs/wrapper.log")
    if not os.path.exists(log_path):
        return None
    try:
        with open(log_path, 'r') as f:
            f.seek(0, os.SEEK_END)
            size = f.tell()
            f.seek(max(0, size - 2000))
            lines = f.readlines()
            for line in reversed(lines):
                if "(" in line and "%" in line and "DL:" in line:
                    start = line.find("[")
                    end = line.find("]")
                    if start != -1 and end != -1:
                        return line[start:end+1]
    except Exception:
        pass
    return "Downloading..."

def is_model_fully_downloaded(model_id: str, cached_repos: set) -> bool:
    if model_id == "./fine_tuned_lora":
        return os.path.exists("./fine_tuned_lora")
    if model_id not in cached_repos:
        return False
        
    normalized_id = model_id.replace("/", "--")
    cache_dir = os.path.expanduser(f"~/.cache/huggingface/hub/models--{normalized_id}")
    snapshots_dir = os.path.join(cache_dir, "snapshots")
    if not os.path.exists(snapshots_dir):
        return False
        
    snapshots = os.listdir(snapshots_dir)
    if not snapshots:
        return False
        
    latest_snapshot = os.path.join(snapshots_dir, snapshots[0])
    has_weights = False
    for root, dirs, files in os.walk(latest_snapshot):
        for file in files:
            if file.endswith((".safetensors", ".bin", ".pt")):
                has_weights = True
                file_path = os.path.join(root, file)
                if os.path.islink(file_path):
                    target = os.readlink(file_path)
                    abs_target = os.path.normpath(os.path.join(root, target))
                    if os.path.exists(abs_target + ".aria2"):
                        return False
                else:
                    if os.path.exists(file_path + ".aria2"):
                        return False
                        
    return has_weights


@app.get("/v1/models")
async def list_models():
    """List all available models with metadata and download status."""
    cached_repos = set()
    try:
        from huggingface_hub import scan_cache_dir
        cache_info = scan_cache_dir()
        for repo in cache_info.repos:
            cached_repos.add(repo.repo_id)
    except Exception as e:
        print(f"⚠️ Error scanning cache: {e}")

    models = []
    for mid, info in MODEL_REGISTRY.items():
        is_downloaded = is_model_fully_downloaded(mid, cached_repos)
        
        # Check if currently downloading
        is_downloading = False
        if not is_downloaded and mid == "google/gemma-4-12B-it":
            is_downloading = is_downloader_running()
            
        status = "completed" if is_downloaded else ("downloading" if is_downloading else "idle")
        status_info = download_status.get(mid, {"status": status, "error": None})
        if status_info["status"] != status and status == "downloading":
            status_info["status"] = "downloading"

        description = info["description"]
        if status_info["status"] == "downloading" and mid == "google/gemma-4-12B-it":
            progress = get_download_progress()
            if progress:
                description += f" | Progress: {progress}"

        models.append(
            {
                "id": mid,
                "object": "model",
                "owned_by": "local",
                "name": info["name"],
                "size": info["size"],
                "quality": info["quality"],
                "vram": info["vram"],
                "description": description,
                "chat_capable": info["chat_capable"],
                "loaded": mid == current_model_id,
                "downloaded": is_downloaded,
                "download_status": status_info["status"],
                "error": status_info.get("error"),
            }
        )
    return {"object": "list", "data": models}


class DownloadModelRequest(BaseModel):
    model_id: str


@app.post("/v1/models/download")
async def download_model_endpoint(request: DownloadModelRequest):
    """Start downloading a model locally."""
    if request.model_id not in MODEL_REGISTRY:
        raise HTTPException(400, f"Unknown model: {request.model_id}")
    
    if request.model_id == "./fine_tuned_lora":
        raise HTTPException(400, "Cannot download custom fine-tuned model. It must be generated or placed locally in ./fine_tuned_lora")
        
    status_info = download_status.get(request.model_id, {"status": "idle"})
    if status_info["status"] == "downloading":
        return {"status": "downloading", "message": "Model is already downloading"}
        
    thread = Thread(target=download_model_in_background, args=(request.model_id,), daemon=True)
    thread.start()
    return {"status": "downloading", "message": "Started downloading model in background"}

@app.get("/v1/health")
async def health_check():
    """Simple health check endpoint for diagnostics."""
    return {
        "status": "ok",
        "model_loaded": model_loaded,
        "current_model": current_model_id,
        "device": DEVICE,
        "is_loading": is_loading,
    }


@app.post("/v1/models/load")
async def load_model_endpoint(request: LoadModelRequest):
    """Hot-swap to a different model."""
    if request.model_id not in MODEL_REGISTRY:
        available = list(MODEL_REGISTRY.keys())
        raise HTTPException(
            400, f"Unknown model: {request.model_id}. Available: {available}"
        )

    # Check if the model is fully downloaded first
    cached_repos = set()
    try:
        from huggingface_hub import scan_cache_dir
        cache_info = scan_cache_dir()
        for repo in cache_info.repos:
            cached_repos.add(repo.repo_id)
    except Exception:
        pass

    if not is_model_fully_downloaded(request.model_id, cached_repos):
        raise HTTPException(
            400, f"Model '{request.model_id}' is not fully downloaded yet. Please wait until download completes."
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
            try:
                load_model(request.model)
            except Exception as e:
                raise HTTPException(400, f"Failed to hot-swap model: {str(e)}")

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
                repetition_penalty=1.15,
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
