#!/usr/bin/env bash
# RestroPOS — Quick Start Script
cd "$(dirname "$0")"

echo "=================================================="
echo "🍽️  Starting RestroPOS in Visual Studio Code..."
echo "=================================================="

# Check if node and npm are installed
if command -v npm &> /dev/null; then
    echo "Node.js detected. Starting fullstack application..."
    npm run dev
elif command -v python3 &> /dev/null; then
    echo "Node not found, but Python 3 detected!"
    echo "Starting RestroPOS website via Python local server..."
    python3 run.py
else
    echo "Opening frontend directly in your default browser..."
    open frontend/index.html
fi
