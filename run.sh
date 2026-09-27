#!/bin/bash
# Simple Sentiment Analyzer - Easy Setup
# Sirf Django chahiye, koi ML library nahi!

echo "=============================="
echo "  Sentiment Analyzer - Easy  "
echo "=============================="
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 nahi mila. Install karo: https://python.org"
    exit 1
fi

# Install only Django
echo "📦 Django install ho raha hai..."
pip install django --quiet

echo ""
echo "🚀 Server start ho raha hai..."
echo "👉 Browser mein kholo: http://127.0.0.1:8000"
echo "   (Ctrl+C se band karo)"
echo ""

python3 manage.py runserver 0.0.0.0:8000
