#!/usr/bin/env python3
"""
NexusAI Standalone — Pre-trained Model Chat Server
==================================================
FastAPI server that loads a free pre-trained model locally,
runs streaming inference, and serves a modern glassmorphic chat interface.

Usage:
  pip install fastapi uvicorn transformers torch
  python3 chat_app.py
  python3 chat_app.py --model phi2
"""

import argparse
import asyncio
import gc
import json
import os
import time
from threading import Thread
import torch
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, StreamingResponse, FileResponse
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForCausalLM, TextIteratorStreamer

MODELS = {
    "custom": {
        "id": "./backend/fine_tuned_lora",
        "name": "Custom Fine-Tuned Model",
    },
    "tinyllama": {
        "id": "TinyLlama/TinyLlama-1.1B-Chat-v1.0",
        "name": "TinyLlama 1.1B",
    },
    "phi2": {
        "id": "microsoft/phi-2",
        "name": "Phi-2",
    },
    "llama3": {
        "id": "meta-llama/Llama-3.2-1B-Instruct",
        "name": "Llama 3.2 1B",
    },
    "mistral": {
        "id": "mistralai/Mistral-7B-Instruct-v0.3",
        "name": "Mistral 7B",
    },
    "gemma": {
        "id": "google/gemma-2-2b-it",
        "name": "Gemma 2 2B",
    },
}

app = FastAPI(title="NexusAI Local Chat Server")

# Global State
model = None
tokenizer = None
model_id = ""
model_name = ""
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

class Message(BaseModel):
    role: str
    content: str

class ChatPayload(BaseModel):
    messages: list[Message]
    max_tokens: int = 512
    temperature: float = 0.7

def load_local_model(name_key: str):
    global model, tokenizer, model_id, model_name
    info = MODELS.get(name_key, MODELS["tinyllama"])
    model_id = info["id"]
    model_name = info["name"]

    print("\n" + "=" * 60)
    print(f"🔄 Loading pre-trained model: {model_name}")
    print(f"📍 Device: {DEVICE}")
    print("=" * 60)

    tokenizer = AutoTokenizer.from_pretrained(model_id, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    load_kwargs = {"trust_remote_code": True}
    if DEVICE == "cuda":
        load_kwargs["torch_dtype"] = torch.float16
        load_kwargs["device_map"] = "auto"
    else:
        load_kwargs["torch_dtype"] = torch.float32
        load_kwargs["low_cpu_mem_usage"] = True

    model = AutoModelForCausalLM.from_pretrained(model_id, **load_kwargs)
    if DEVICE == "cpu":
        model = model.to(DEVICE)
    model.eval()

    print(f"✅ Pre-trained model '{model_name}' loaded successfully!")
    print("=" * 60 + "\n")

def format_chat_prompt(messages: list[Message]) -> str:
    """Format prompt with model-specific templates."""
    formatted = [{"role": m.role, "content": m.content} for m in messages]
    try:
        return tokenizer.apply_chat_template(formatted, tokenize=False, add_generation_prompt=True)
    except Exception:
        # Fallback manual formatting
        parts = []
        for m in formatted:
            prefix = {"system": "System", "user": "Human", "assistant": "Assistant"}.get(m["role"], m["role"])
            parts.append(f"{prefix}: {m['content']}")
        parts.append("Assistant:")
        return "\n".join(parts)

async def stream_generation(payload: ChatPayload):
    prompt = format_chat_prompt(payload.messages)
    inputs = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=2048)
    inputs = {k: v.to(model.device) for k, v in inputs.items()}

    streamer = TextIteratorStreamer(tokenizer, skip_prompt=True, skip_special_tokens=True)
    generation_kwargs = {
        **inputs,
        "max_new_tokens": payload.max_tokens,
        "temperature": max(payload.temperature, 0.01),
        "do_sample": True,
        "streamer": streamer,
        "pad_token_id": tokenizer.pad_token_id,
    }

    thread = Thread(target=model.generate, kwargs=generation_kwargs)
    thread.start()

    for text in streamer:
        if text:
            yield f"data: {json.dumps({'content': text})}\n\n"
            await asyncio.sleep(0)
    
    yield "data: [DONE]\n\n"
    thread.join()

@app.get("/")
async def get_index():
    html_content = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NexusAI Standalone — Pre-trained Local LLM Chat</title>
    <link rel="stylesheet" href="/style.css">
</head>
<body>
    <div class="chat-container">
        <!-- Sidebar -->
        <aside class="sidebar">
            <div class="sidebar-header">
                <span class="logo">🤖 NexusAI Local</span>
            </div>
            <div class="model-badge">
                <span class="badge-label">Active Model:</span>
                <span class="badge-value" id="active-model-name">Loading...</span>
            </div>
            <div class="device-badge">
                <span class="badge-label">Hardware:</span>
                <span class="badge-value" id="hardware-device">Loading...</span>
            </div>
            <div class="info-box">
                <p>This is a zero-cost local chatbot interface running completely offline using pre-trained weights.</p>
            </div>
        </aside>

        <!-- Chat Area -->
        <main class="chat-area">
            <header class="chat-header">
                <h1>Local LLM Chat</h1>
                <span class="status-indicator ready">● Ready</span>
            </header>

            <div class="messages" id="messages-container">
                <div class="message assistant">
                    <div class="avatar">🤖</div>
                    <div class="bubble">Hello! I am your locally hosted pre-trained model. How can I assist you today?</div>
                </div>
            </div>

            <form class="input-area" id="chat-form">
                <input type="text" id="user-input" placeholder="Type a message..." required autocomplete="off">
                <button type="submit" id="send-btn">Send</button>
            </form>
        </main>
    </div>
    <script src="/script.js"></script>
</body>
</html>"""
    return HTMLResponse(content=html_content)

@app.get("/style.css")
async def get_style():
    if os.path.exists("style.css"):
        return FileResponse("style.css")
    raise HTTPException(404, "style.css not found")

@app.get("/script.js")
async def get_script():
    if os.path.exists("script.js"):
        return FileResponse("script.js")
    raise HTTPException(404, "script.js not found")

@app.get("/api/status")
async def get_status():
    return {
        "model": model_name,
        "device": DEVICE,
        "gpu_available": torch.cuda.is_available()
    }

@app.post("/api/chat")
async def chat_endpoint(payload: ChatPayload):
    if not model:
        raise HTTPException(503, "Model not loaded.")
    return StreamingResponse(
        stream_generation(payload),
        media_type="text/event-stream"
    )

def main():
    parser = argparse.ArgumentParser(description="NexusAI Local Chat Server")
    parser.add_argument(
        "--model",
        choices=["custom", "tinyllama", "phi2", "llama3", "mistral", "gemma"],
        default="tinyllama",
        help="Select pre-trained model to load (default: tinyllama)"
    )
    parser.add_argument("--port", type=int, default=5000, help="Server port")
    args = parser.parse_args()

    load_local_model(args.model)

    print(f"\n🚀 Local server starting on: http://localhost:{args.port}")
    uvicorn.run(app, host="0.0.0.0", port=args.port)

if __name__ == "__main__":
    main()
