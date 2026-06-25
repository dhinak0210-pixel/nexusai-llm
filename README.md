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

A premium AI chat platform that works on **any device** — phone, tablet, laptop, desktop.

## ☁️ Cloud Models (work instantly)
Powered by HuggingFace Inference API:
- DeepSeek V3
- Qwen 2.5 Coder 32B
- Llama 3.3 70B
- DeepSeek R1

## 🖥️ Local Models (loads in background)
- TinyLlama 1.1B with custom LoRA fine-tuning support

## Features

- 🎨 Glassmorphism dark/light UI
- 📱 Fully responsive — works on phone, tablet, desktop
- 🔄 Dynamic model switching
- 🧠 Persistent Memory Vault
- 📄 PDF, PPT, Code artifact generation
- 🔐 Server-side API key (never exposed to browser)
- 📡 Streaming responses

## Setup (HuggingFace Space)

Set the following secret in **Settings → Secrets**:

| Secret | Description |
|--------|-------------|
| `HF_TOKEN` | Your HuggingFace API token (for cloud models) |

## Local Development

```bash
# Install frontend deps
npm install

# Start both servers
./start.sh
```
