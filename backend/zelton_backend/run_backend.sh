#!/bin/bash

# Zelton Backend Management Script
# This script helps you start/stop/restart the backend service

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/ZeltonLivings/appsdata/backend/zelton_backend"
VENV_DIR="/ZeltonLivings/appsdata/backend/venv"
PID_FILE="/ZeltonLivings/appsdata/backend/zelton_backend/gunicorn.pid"
PORT=8000

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

# Function to check if Gunicorn is running
is_gunicorn_running() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            return 0
        else
            rm -f "$PID_FILE"
            return 1
        fi
    else
        return 1
    fi
}

# Function to start backend
start_backend() {
    print_info "Starting Zelton Backend..."
    
    # Check if already running
    if is_gunicorn_running; then
        print_warning "Backend is already running (PID: $(cat "$PID_FILE"))"
        return 0
    fi
    
    # Kill any existing processes on port 8000
    if lsof -i :$PORT > /dev/null 2>&1; then
        print_warning "Port $PORT is in use. Killing existing process..."
        lsof -ti :$PORT | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
    
    # Change to project directory
    cd "$PROJECT_DIR"
    
    # Activate virtual environment
    source "$VENV_DIR/bin/activate"
    
    # Start Gunicorn
    gunicorn --config gunicorn.conf.py zelton_backend.wsgi:application
    
    # Wait a moment for it to start
    sleep 3
    
    # Check if it started successfully
    if is_gunicorn_running; then
        print_status "Backend started successfully!"
        print_info "PID: $(cat "$PID_FILE")"
        print_info "URL: http://127.0.0.1:$PORT/api/"
    else
        print_error "Failed to start backend"
        return 1
    fi
}

# Function to stop backend
stop_backend() {
    print_info "Stopping Zelton Backend..."
    
    if is_gunicorn_running; then
        PID=$(cat "$PID_FILE")
        print_info "Stopping process $PID..."
        kill -TERM "$PID"
        
        # Wait for graceful shutdown
        for i in {1..10}; do
            if ! ps -p "$PID" > /dev/null 2>&1; then
                break
            fi
            sleep 1
        done
        
        # Force kill if still running
        if ps -p "$PID" > /dev/null 2>&1; then
            print_warning "Force killing process $PID..."
            kill -9 "$PID"
        fi
        
        rm -f "$PID_FILE"
        print_status "Backend stopped successfully!"
    else
        print_warning "Backend is not running"
    fi
}

# Function to restart backend
restart_backend() {
    print_info "Restarting Zelton Backend..."
    stop_backend
    sleep 2
    start_backend
}

# Function to show status
show_status() {
    print_info "Zelton Backend Status:"
    echo ""
    
    if is_gunicorn_running; then
        PID=$(cat "$PID_FILE")
        print_status "✅ Backend is running (PID: $PID)"
        print_info "URL: http://127.0.0.1:$PORT/api/"
        
        # Show process info
        echo ""
        print_info "Process Information:"
        ps aux | grep gunicorn | grep -v grep | head -1
        
        # Test API
        echo ""
        print_info "Testing API..."
        if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:$PORT/api/ | grep -q "401\|200\|302"; then
            print_status "API is responding correctly"
        else
            print_warning "API is not responding correctly"
        fi
    else
        print_error "❌ Backend is not running"
    fi
}

# Function to show logs
show_logs() {
    print_info "Showing recent logs..."
    echo ""
    
    if [ -f "$PROJECT_DIR/logs/gunicorn_error.log" ]; then
        echo "=== Gunicorn Error Log (last 20 lines) ==="
        tail -20 "$PROJECT_DIR/logs/gunicorn_error.log"
    fi
    
    echo ""
    if [ -f "$PROJECT_DIR/logs/gunicorn_access.log" ]; then
        echo "=== Gunicorn Access Log (last 10 lines) ==="
        tail -10 "$PROJECT_DIR/logs/gunicorn_access.log"
    fi
}

# Function to show usage
show_usage() {
    echo "Zelton Backend Management Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start       Start the backend service"
    echo "  stop        Stop the backend service"
    echo "  restart     Restart the backend service"
    echo "  status      Show service status"
    echo "  logs        Show service logs"
    echo ""
    echo "Examples:"
    echo "  $0 start    # Start the backend"
    echo "  $0 status   # Check if backend is running"
    echo "  $0 stop     # Stop the backend"
}

# Main script logic
case "${1:-}" in
    start)
        start_backend
        ;;
    stop)
        stop_backend
        ;;
    restart)
        restart_backend
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    *)
        show_usage
        ;;
esac
