#!/bin/bash
# ============================================
# NexusAI — One-Click Start Script
# Starts both the backend server and frontend
# ============================================

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
LOG_FILE="$BACKEND_DIR/server.log"

echo ""
echo "🚀 Starting NexusAI..."
echo "=================================================="

# Kill any existing process on port 8000
if fuser -k 8000/tcp 2>/dev/null; then
  echo "⚠️  Killed existing process on port 8000"
  sleep 1
fi

# Start backend server in background
echo "🔧 Starting local LLM backend on http://localhost:8000 ..."
cd "$BACKEND_DIR"
nohup python3 server.py > "$LOG_FILE" 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# Wait for backend to become ready
echo "⏳ Loading model (this may take ~30-60 seconds)..."
for i in $(seq 1 60); do
  if curl -s http://localhost:8000/v1/models > /dev/null 2>&1; then
    echo "✅ Backend ready!"
    break
  fi
  sleep 2
done

# Start frontend dev server
echo ""
echo "🎨 Starting frontend on http://localhost:5173 ..."
cd "$PROJECT_DIR"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "=================================================="
echo "✅ NexusAI is running!"
echo "   🌐 UI:      http://localhost:5173"
echo "   🔌 API:     http://localhost:8000"
echo "   📡 API Docs: http://localhost:8000/docs"
echo ""
echo "   Press Ctrl+C to stop both servers."
echo "=================================================="
echo ""

# Wait — when user presses Ctrl+C, kill both
trap "echo ''; echo '🛑 Stopping NexusAI...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM
wait
