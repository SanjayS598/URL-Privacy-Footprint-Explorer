#!/bin/bash
# Quick start script for Privacy Footprint Explorer
# This script helps you get started with the project

set -e

echo "Privacy Footprint Explorer - Setup Helper"
echo "=============================================="
echo ""

# Check if we're in the right directory
if [ ! -f "README.md" ]; then
    echo "Error: Please run this script from the project root directory"
    exit 1
fi

# Check prerequisites
echo "Checking prerequisites..."
echo ""

# Check Python
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo "[OK] Python installed: $PYTHON_VERSION"
else
    echo "[ERROR] Python 3 not found"
    exit 1
fi

# Check Docker
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    echo "[OK] Docker installed: $DOCKER_VERSION"
    DOCKER_OK=true
else
    echo "[WARN] Docker not found - you'll need to install it"
    echo "   Download from: https://www.docker.com/products/docker-desktop/"
    DOCKER_OK=false
fi

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "[OK] Node.js installed: $NODE_VERSION"
    NODE_OK=true
else
    echo "[WARN] Node.js not found - you'll need it for Phase 2"
    echo "   Download from: https://nodejs.org/"
    NODE_OK=false
fi

echo ""
echo "=============================================="
echo ""

# Set up Python environment
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
    echo "[OK] Virtual environment created"
else
    echo "[OK] Virtual environment already exists"
fi

echo ""
echo "Installing Python dependencies..."
source venv/bin/activate
pip install -q --upgrade pip
pip install -q -r apps/api/requirements.txt
echo "[OK] Dependencies installed"

echo ""
echo "Verifying API code..."
cd apps/api
python verify.py
cd ../..

echo ""
echo "=============================================="
echo ""

if [ "$DOCKER_OK" = true ]; then
    echo "Ready to start services!"
    echo ""
    echo "Run these commands:"
    echo "  cd infra"
    echo "  docker compose up -d"
    echo ""
    echo "Then test:"
    echo "  curl http://localhost:8000/health"
    echo "  open http://localhost:8000/docs"
else
    echo "Next Steps:"
    echo ""
    echo "1. Install Docker Desktop:"
    echo "   https://www.docker.com/products/docker-desktop/"
    echo ""
    echo "2. Start services:"
    echo "   cd infra && docker compose up -d"
    echo ""
    echo "3. Test the API:"
    echo "   curl http://localhost:8000/health"
fi

echo ""
echo "See README.md for complete documentation"
echo ""
