# ======================================================
# NexusAI — Unified Docker Image
# Serves React frontend + FastAPI backend on port 7860
# Compatible with Hugging Face Spaces (Docker SDK)
# ======================================================

# Stage 1: Build the React frontend
FROM node:20-slim AS frontend-builder

WORKDIR /frontend

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY index.html vite.config.js eslint.config.js ./
COPY src ./src
COPY public ./public

# Inject HF API key at build time (Space secret)
ARG VITE_HF_API_KEY
ENV VITE_HF_API_KEY=$VITE_HF_API_KEY

RUN npm run build

# Stage 2: Python backend + serve frontend
FROM python:3.11-slim

WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/server.py ./backend/server.py

# Copy built frontend from Stage 1
COPY --from=frontend-builder /frontend/dist ./dist

# Hugging Face Spaces runs on port 7860
ENV PORT=7860
ENV HOST=0.0.0.0

# Expose the port
EXPOSE 7860

# Start the FastAPI server (serves both API + static frontend)
# Uses TinyLlama by default — downloads on first start (~600MB)
CMD ["python", "backend/server.py", "--model", "TinyLlama/TinyLlama-1.1B-Chat-v1.0", "--port", "7860", "--host", "0.0.0.0"]
