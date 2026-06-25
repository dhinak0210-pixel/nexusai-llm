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

# ── Copy backend source & model downloader ────────────────────────────────────
COPY backend/server.py ./backend/server.py
COPY backend/download_model.py ./backend/download_model.py

# ── Copy LoRA adapter weights (your fine-tuned model) ─────────────────────────
COPY backend/fine_tuned_lora ./fine_tuned_lora

# ── Pre-download TinyLlama into the Docker image ──────────────────────────────
# This bakes model weights into the image so the container starts instantly.
# HF_TOKEN is passed as a build secret from Space settings.
ARG HF_TOKEN
ENV HF_TOKEN=${HF_TOKEN}
RUN python3 backend/download_model.py

# ── Copy built frontend from Stage 1 ──────────────────────────────────────────
COPY --from=frontend-builder /frontend/dist ./dist

# Hugging Face Spaces runs on port 7860
ENV PORT=7860
ENV HOST=0.0.0.0

EXPOSE 7860

# Start server — loads fine_tuned_lora in background thread (TinyLlama already cached)
CMD ["python", "backend/server.py", "--model", "./fine_tuned_lora", "--port", "7860", "--host", "0.0.0.0"]
