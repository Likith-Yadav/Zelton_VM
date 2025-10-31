#!/bin/bash

# Zelton Backend Startup Script
# This script ensures the backend starts automatically

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/ZeltonLivings/appsdata/backend/zelton_backend"
SCRIPT_PATH="/ZeltonLivings/appsdata/backend/zelton_backend/run_backend.sh"

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

echo -e "${BLUE}🚀 Zelton Backend Startup Script${NC}"
echo "=================================="

# Check if backend is already running
if "$SCRIPT_PATH" status > /dev/null 2>&1; then
    print_status "Backend is already running!"
    "$SCRIPT_PATH" status
    exit 0
fi

# Start the backend
print_info "Starting Zelton Backend..."
"$SCRIPT_PATH" start

# Verify it's running
sleep 3
if "$SCRIPT_PATH" status > /dev/null 2>&1; then
    print_status "Backend started successfully!"
    echo ""
    print_info "Your backend will now continue running even if you close SSH!"
    print_info "Backend URL: http://127.0.0.1:8000/api/"
    echo ""
    print_info "To manage the backend, use these commands:"
    echo "  ./run_backend.sh status   # Check status"
    echo "  ./run_backend.sh stop     # Stop backend"
    echo "  ./run_backend.sh restart  # Restart backend"
    echo "  ./run_backend.sh logs     # View logs"
else
    print_error "Failed to start backend!"
    exit 1
fi
