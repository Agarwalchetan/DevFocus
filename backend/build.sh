#!/bin/bash
# build.sh - Backend build script for Render
# This script runs during the build phase

echo "================================"
echo "Building DevFocus Backend..."
echo "================================"

# Upgrade pip to latest version
echo "📦 Upgrading pip..."
pip install --upgrade pip

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

echo "✅ Build complete!"
echo "================================"
