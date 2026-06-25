# ======================================================
# NexusAI — Unified Docker Image
# Serves React frontend + FastAPI backend on port 7860
# Compatible with Hugging Face Spaces (Docker SDK)
# ======================================================

# Stage 1: Build the React frontend
FROM node:20-slim AS frontend-builder

WORKDIR /frontend

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html vite.config.js eslint.config.js ./
COPY src ./src
COPY public ./public

RUN npm run build

# Stage 2: Python backend + pre-downloaded model + frontend
FROM python:3.11-slim

WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ git curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# ── Pre-download TinyLlama base model into the image ──────────────────────────
# This bakes the model weights into the Docker layer so the container starts
# instantly without any download on first run.
ARG HF_TOKEN
ENV HF_TOKEN=${HF_TOKEN}

RUN python3 -c "
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch
print('Downloading TinyLlama tokenizer...')
tok = AutoTokenizer.from_pretrained(
    'TinyLlama/TinyLlama-1.1B-Chat-v1.0',
    token='${HF_TOKEN}' if '${HF_TOKEN}' else None,
    trust_remote_code=True
)
print('Downloading TinyLlama model weights...')
model = AutoModelForCausalLM.from_pretrained(
    'TinyLlama/TinyLlama-1.1B-Chat-v1.0',
    token='${HF_TOKEN}' if '${HF_TOKEN}' else None,
    torch_dtype=torch.bfloat16,
    trust_remote_code=True
)
print('TinyLlama cached successfully.')
"

# ── Copy backend source ────────────────────────────────────────────────────────
COPY backend/server.py ./backend/server.py

# ── Copy LoRA adapter weights (your fine-tuned model) ─────────────────────────
COPY backend/fine_tuned_lora ./fine_tuned_lora

# ── Copy built frontend from Stage 1 ──────────────────────────────────────────
COPY --from=frontend-builder /frontend/dist ./dist

# Hugging Face Spaces runs on port 7860
ENV PORT=7860
ENV HOST=0.0.0.0

EXPOSE 7860

# Start server — loads fine_tuned_lora in background thread (TinyLlama is already cached)
CMD ["python", "backend/server.py", "--model", "./fine_tuned_lora", "--port", "7860", "--host", "0.0.0.0"]
