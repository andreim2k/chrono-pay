#!/usr/bin/env bash
set -e

PORT=9002
echo "🚀 Preparing local environment on port $PORT..."

# Check and clean up any process lingering on port 9002
PID=$(lsof -ti :$PORT 2>/dev/null || true)
if [ -n "$PID" ]; then
  echo "⚠️  Found lingering process on port $PORT (PID: $PID). Terminating..."
  kill -9 $PID 2>/dev/null || true
  sleep 1
fi

echo "✅ Port $PORT is clean."
echo "🌟 Starting ChronoPay local development server..."
npm run dev
