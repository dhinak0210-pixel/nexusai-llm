# ============================================================
# 🚀 NexusAI — Free GPU Multi-Model LLM Server (Google Colab)
# ============================================================
# 
# HOW TO USE:
#   1. Open in Google Colab
#   2. Runtime → Change runtime type → T4 GPU (Free!)
#   3. Run Cell 1 (Install dependencies)
#   4. Run Cell 2 (Launch server)
#   5. Copy the ngrok URL → Paste into NexusAI Settings
#
# You can swap models live from the NexusAI UI!
# ============================================================


# ████████████████████████████████████████████████
# CELL 1: Install Dependencies (run this first!)
# ████████████████████████████████████████████████

# !pip install -q fastapi uvicorn transformers accelerate torch pyngrok nest_asyncio bitsandbytes


# ████████████████████████████████████████████████
# CELL 2: Launch Multi-Model Server
# ████████████████████████████████████████████████

import asyncio
import gc
import json
import time
import uuid
from threading import Thread

import nest_asyncio
import torch
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from transformers import AutoModelForCausalLM, AutoTokenizer, TextIteratorStreamer
from pyngrok import ngrok

nest_asyncio.apply()

# ============================================
# Configuration
# ============================================
NGROK_AUTH_TOKEN = ""  # Optional: get yours at https://dashboard.ngrok.com
INITIAL_MODEL = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"  # Loaded on startup

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
print(f"🖥️  Device: {DEVICE}")
if DEVICE == "cuda":
    print(f"🎮 GPU: {torch.cuda.get_device_name(0)}")
    print(f"💾 Total VRAM: {torch.cuda.get_device_properties(0).total_mem / 1e9:.1f} GB")

# ============================================
# Free Models Registry
# ============================================
MODEL_REGISTRY = {
    "TinyLlama/TinyLlama-1.1B-Chat-v1.0": {
        "id": "TinyLlama/TinyLlama-1.1B-Chat-v1.0", "name": "TinyLlama 1.1B",
        "size": "1.1B", "quality": 3, "vram": "~2 GB",
        "description": "Great starter — fast, lightweight, chat-capable", "chat_capable": True,
    },
    "microsoft/phi-2": {
        "id": "microsoft/phi-2", "name": "Phi-2", "size": "2.7B",
        "quality": 4, "vram": "~5 GB",
        "description": "Very capable — Microsoft's compact reasoning powerhouse", "chat_capable": True,
    },
    "meta-llama/Llama-3.2-1B-Instruct": {
        "id": "meta-llama/Llama-3.2-1B-Instruct", "name": "Llama 3.2 1B",
        "size": "1B", "quality": 4, "vram": "~2 GB",
        "description": "Meta's latest — excellent instruction following", "chat_capable": True,
    },
    "mistralai/Mistral-7B-Instruct-v0.3": {
        "id": "mistralai/Mistral-7B-Instruct-v0.3", "name": "Mistral 7B",
        "size": "7B", "quality": 5, "vram": "~14 GB",
        "description": "Best open-source — top quality, needs T4 GPU", "chat_capable": True,
    },
}

# ============================================
# Model Manager
# ============================================
current_model_id = None
model = None
tokenizer = None
model_loaded = False
is_loading = False

def unload_model():
    global model, tokenizer, model_loaded, current_model_id
    if model is not None:
        del model; del tokenizer
        model = tokenizer = None
        model_loaded = False; current_model_id = None
        gc.collect()
        if DEVICE == "cuda": torch.cuda.empty_cache()
        print("🗑️  Previous model unloaded")

def load_model(model_id):
    global model, tokenizer, model_loaded, current_model_id, is_loading
    if current_model_id == model_id and model_loaded:
        return
    is_loading = True
    if model_loaded: unload_model()
    print(f"\n🔄 Loading: {model_id}...")
    
    tokenizer = AutoTokenizer.from_pretrained(model_id, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    
    kwargs = {"trust_remote_code": True}
    if DEVICE == "cuda":
        kwargs["torch_dtype"] = torch.float16
        kwargs["device_map"] = "auto"
    else:
        kwargs["torch_dtype"] = torch.float32
    
    model = AutoModelForCausalLM.from_pretrained(model_id, **kwargs)
    if DEVICE == "cpu": model = model.to(DEVICE)
    model.eval()
    
    current_model_id = model_id
    model_loaded = True
    is_loading = False
    
    params = sum(p.numel() for p in model.parameters()) / 1e6
    print(f"✅ Loaded! ({params:.0f}M params)")
    if DEVICE == "cuda":
        print(f"💾 GPU Memory: {torch.cuda.memory_allocated() / 1e9:.1f} GB")

# ============================================
# FastAPI App
# ============================================
app = FastAPI(title="NexusAI Colab Multi-Model Server")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

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

def format_prompt(messages):
    info = MODEL_REGISTRY.get(current_model_id, {})
    formatted = [{"role": m.role, "content": m.content} for m in messages]
    if info.get("chat_capable", True):
        try:
            return tokenizer.apply_chat_template(formatted, tokenize=False, add_generation_prompt=True)
        except: pass
    parts = []
    for m in formatted:
        prefix = {"system": "System", "user": "Human", "assistant": "Assistant"}.get(m["role"], m["role"])
        parts.append(f"{prefix}: {m['content']}")
    parts.append("Assistant:")
    return "\n".join(parts)

async def stream_generate(request):
    prompt = format_prompt(request.messages)
    inputs = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=2048)
    inputs = {k: v.to(model.device) for k, v in inputs.items()}
    streamer = TextIteratorStreamer(tokenizer, skip_prompt=True, skip_special_tokens=True)
    kwargs = {**inputs, "max_new_tokens": request.max_tokens,
              "temperature": max(request.temperature, 0.01), "top_p": request.top_p,
              "do_sample": True, "streamer": streamer, "pad_token_id": tokenizer.pad_token_id}
    Thread(target=model.generate, kwargs=kwargs).start()
    rid = f"chatcmpl-{uuid.uuid4().hex[:8]}"
    for text in streamer:
        if text:
            yield f"data: {json.dumps({'id': rid, 'object': 'chat.completion.chunk', 'created': int(time.time()), 'model': current_model_id, 'choices': [{'index': 0, 'delta': {'content': text}, 'finish_reason': None}]})}\n\n"
            await asyncio.sleep(0)
    yield f"data: {json.dumps({'id': rid, 'object': 'chat.completion.chunk', 'created': int(time.time()), 'model': current_model_id, 'choices': [{'index': 0, 'delta': {}, 'finish_reason': 'stop'}]})}\n\n"
    yield "data: [DONE]\n\n"

@app.get("/")
async def root():
    return {"service": "NexusAI Colab Multi-Model Server", "current_model": current_model_id,
            "device": DEVICE, "status": "ready" if model_loaded else ("loading" if is_loading else "idle"),
            "gpu_available": torch.cuda.is_available(),
            "gpu_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None}

@app.get("/v1/models")
async def list_models():
    return {"object": "list", "data": [
        {**info, "loaded": info["id"] == current_model_id} for info in MODEL_REGISTRY.values()
    ]}

@app.post("/v1/models/load")
async def load_model_endpoint(request: LoadModelRequest):
    if request.model_id not in MODEL_REGISTRY:
        raise HTTPException(400, f"Unknown model. Available: {list(MODEL_REGISTRY.keys())}")
    if is_loading:
        raise HTTPException(409, "A model is currently loading...")
    load_model(request.model_id)
    return {"status": "loaded", "model": request.model_id, "name": MODEL_REGISTRY[request.model_id]["name"]}

@app.post("/v1/chat/completions")
async def chat(request: ChatRequest):
    if is_loading: raise HTTPException(503, "Model is loading...")
    if not model_loaded: raise HTTPException(503, "No model loaded.")
    if request.model and request.model != current_model_id and request.model in MODEL_REGISTRY:
        load_model(request.model)
    if request.stream:
        return StreamingResponse(stream_generate(request), media_type="text/event-stream",
                                headers={"Cache-Control": "no-cache", "Connection": "keep-alive"})
    prompt = format_prompt(request.messages)
    inputs = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=2048)
    inputs = {k: v.to(model.device) for k, v in inputs.items()}
    with torch.no_grad():
        out = model.generate(**inputs, max_new_tokens=request.max_tokens,
                             temperature=max(request.temperature, 0.01), top_p=request.top_p,
                             do_sample=True, pad_token_id=tokenizer.pad_token_id)
    text = tokenizer.decode(out[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True)
    return {"id": f"chatcmpl-{uuid.uuid4().hex[:8]}", "object": "chat.completion",
            "created": int(time.time()), "model": current_model_id,
            "choices": [{"index": 0, "message": {"role": "assistant", "content": text}, "finish_reason": "stop"}]}

# ============================================
# Launch with ngrok
# ============================================
print(f"\n🔄 Loading initial model: {INITIAL_MODEL}")
load_model(INITIAL_MODEL)

if NGROK_AUTH_TOKEN:
    ngrok.set_auth_token(NGROK_AUTH_TOKEN)

public_url = ngrok.connect(8000)

print("\n" + "=" * 60)
print(f"🌐 PUBLIC URL: {public_url}")
print("=" * 60)
print("\n📋 How to use:")
print("   1. Copy the URL above")
print("   2. Open NexusAI → Settings → Local/Colab")
print("   3. Paste URL → Save")
print("   4. Start chatting! Switch models from the UI ⚡")
print()

uvicorn.run(app, host="0.0.0.0", port=8000)
