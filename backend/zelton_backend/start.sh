#!/bin/bash

# Simple startup script for Zelton Backend with Nginx + Gunicorn
# This script starts the services without requiring system-level installation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/ZeltonLivings/appsdata/backend/zelton_backend"
VENV_DIR="/ZeltonLivings/appsdata/backend/venv"

echo -e "${GREEN}🚀 Starting Zelton Backend Services${NC}"

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

# Check if nginx is available
if ! command -v nginx &> /dev/null; then
    print_error "Nginx is not installed. Please install nginx first."
    print_warning "You can install nginx with: sudo dnf install nginx"
    print_warning "Or run without nginx using: python manage.py runserver 0.0.0.0:8000"
    exit 1
fi

# Check if project directory exists
if [ ! -d "$PROJECT_DIR" ]; then
    print_error "Project directory $PROJECT_DIR not found"
    exit 1
fi

cd "$PROJECT_DIR"

# Activate virtual environment
print_status "Activating virtual environment..."
source "$VENV_DIR/bin/activate"

# Check if gunicorn is running
if pgrep -f "gunicorn.*zelton_backend.wsgi:application" > /dev/null; then
    print_warning "Gunicorn is already running. Stopping existing processes..."
    pkill -f "gunicorn.*zelton_backend.wsgi:application"
    sleep 2
fi

# Start Gunicorn
print_status "Starting Gunicorn..."
gunicorn --config gunicorn.conf.py zelton_backend.wsgi:application --daemon

# Wait a moment for gunicorn to start
sleep 3

# Check if gunicorn started successfully
if pgrep -f "gunicorn.*zelton_backend.wsgi:application" > /dev/null; then
    print_status "Gunicorn started successfully"
else
    print_error "Failed to start Gunicorn"
    exit 1
fi

# Test if Django is responding
print_status "Testing Django backend..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/ | grep -q "401\|200\|302"; then
    print_status "Django backend is responding correctly"
else
    print_error "Django backend is not responding"
    exit 1
fi

# Start Nginx (if available and not already running)
if command -v nginx &> /dev/null; then
    if pgrep nginx > /dev/null; then
        print_warning "Nginx is already running"
    else
        print_status "Starting Nginx..."
        # Test nginx configuration
        if nginx -t -c "$PROJECT_DIR/nginx-simple.conf" 2>/dev/null; then
            nginx -c "$PROJECT_DIR/nginx-simple.conf"
            print_status "Nginx started successfully on port 8080"
        else
            print_warning "Nginx configuration test failed. Running without nginx."
            print_warning "Django backend is available at: http://localhost:8000"
        fi
    fi
else
    print_warning "Nginx not available. Django backend is running at: http://localhost:8000"
fi

echo ""
print_status "Zelton Backend is now running!"
echo ""
echo "🌐 Access URLs:"
echo "   Django Backend: http://localhost:8000"
echo "   API Endpoints:  http://localhost:8000/api/"
echo "   Admin Panel:    http://localhost:8000/admin/"
if pgrep nginx > /dev/null; then
    echo "   Nginx Proxy:   http://localhost:8080"
fi
echo ""
echo "📊 Service Status:"
echo "   Gunicorn: $(pgrep -f gunicorn | wc -l) processes running"
if pgrep nginx > /dev/null; then
    echo "   Nginx: Running"
else
    echo "   Nginx: Not running"
fi
echo ""
echo "📝 Logs:"
echo "   Django: $PROJECT_DIR/logs/django.log"
echo "   Gunicorn: $PROJECT_DIR/logs/gunicorn_*.log"
if pgrep nginx > /dev/null; then
    echo "   Nginx: $PROJECT_DIR/logs/nginx_*.log"
fi
echo ""
echo "🛑 To stop services:"
echo "   pkill -f gunicorn"
if pgrep nginx > /dev/null; then
    echo "   nginx -s quit"
fi
echo ""
echo -e "${GREEN}🎉 Setup complete!${NC}"
