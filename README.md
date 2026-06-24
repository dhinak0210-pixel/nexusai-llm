---
title: NexusAI
emoji: 🤖
colorFrom: purple
colorTo: blue
sdk: docker
pinned: false
license: mit
app_port: 7860
---

# NexusAI — Intelligent Chat Assistant

A premium, ultra-luxury AI chat platform with dual-backend support:

- **☁️ Cloud Models** — Powered by HuggingFace Inference API (DeepSeek V3, Qwen 2.5 Coder, Llama 3.3 70B, and more)
- **🖥️ Local Models** — Self-hosted TinyLlama 1.1B with custom LoRA fine-tuning support

## Features

- 🎨 Glassmorphism dark/light UI
- 🔄 Dynamic model switching with live header updates
- 🧠 Persistent Memory Vault
- 📄 PDF, PPT, Code artifact generation
- 🔐 Secure API key management via environment variables
- 📡 Streaming responses

## Environment Variables

Set the following secret in your Hugging Face Space settings:

| Variable | Description |
|----------|-------------|
| `VITE_HF_API_KEY` | Your HuggingFace API token (for Cloud Models) |

## Local Development

```bash
# Install frontend deps
npm install

# Start frontend dev server
npm run dev

# Start backend (in a separate terminal)
cd backend
python server.py
```
