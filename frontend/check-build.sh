#!/bin/bash
# Diagnostic script to check what's in the build output

echo "================================"
echo "Frontend Build Diagnostic Script"
echo "================================"

echo ""
echo "1. Building React app..."
npm run build

echo ""
echo "2. Checking build directory structure..."
if [ -d "build" ]; then
    echo "✅ build/ directory exists"
    echo ""
    echo "Contents of build/:"
    ls -lah build/
    echo ""
    echo "3. Checking for index.html..."
    if [ -f "build/index.html" ]; then
        echo "✅ build/index.html exists"
        echo "First 500 characters of index.html:"
        head -c 500 build/index.html
    else
        echo "❌ build/index.html NOT FOUND!"
    fi
    echo ""
    echo "4. Checking for static assets..."
    if [ -d "build/static" ]; then
        echo "✅ build/static/ directory exists"
        echo "Static files:"
        find build/static -type f | head -20
    else
        echo "❌ build/static/ directory NOT FOUND!"
    fi
else
    echo "❌ build/ directory does NOT exist!"
    echo ""
    echo "Checking for other possible output directories:"
    ls -lah | grep -E "dist|out|public"
fi

echo ""
echo "================================"
echo "Diagnostic complete!"
echo "================================"
