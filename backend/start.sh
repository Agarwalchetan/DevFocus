#!/bin/bash
# start.sh - Backend start script for Render
# This script runs to start the application

echo "================================"
echo "Starting DevFocus Backend..."
echo "================================"

# Check if PORT is set
if [ -z "$PORT" ]; then
    echo "⚠️  PORT environment variable not set, using default 8001"
    export PORT=8001
fi

echo "🚀 Starting server on port $PORT"

# Start uvicorn server
uvicorn server:app --host 0.0.0.0 --port $PORT
