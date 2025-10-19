#!/bin/bash

# Domain Setup Script for Zelton Backend Production
# This script sets up the backend to be accessible at zelton.in/backend

echo "=== Zelton Backend Domain Setup (/backend path) ==="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script needs to be run as root (use sudo)"
    echo "Please run: sudo ./setup_backend_domain.sh"
    exit 1
fi

echo "✅ Running as root"

# Install Nginx if not already installed
if ! command -v nginx &> /dev/null; then
    echo "📦 Installing Nginx..."
    dnf install -y nginx
else
    echo "✅ Nginx already installed"
fi

# Create SSL certificate directory
echo "🔐 Setting up SSL certificates..."
mkdir -p /etc/ssl/certs
mkdir -p /etc/ssl/private

# Generate self-signed SSL certificate (replace with real certificate later)
echo "🔑 Generating self-signed SSL certificate..."
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/private/zelton.key \
    -out /etc/ssl/certs/zelton.crt \
    -subj "/C=IN/ST=State/L=City/O=Zelton/CN=zelton.in"

# Copy Nginx configuration for backend
echo "⚙️  Setting up Nginx configuration for /backend path..."
cp nginx_backend.conf /etc/nginx/nginx.conf

# Create log directories
echo "📝 Setting up log directories..."
mkdir -p /var/log/nginx
touch /var/log/nginx/zelton_access.log
touch /var/log/nginx/zelton_error.log
touch /var/log/nginx/api_access.log
touch /var/log/nginx/api_error.log

# Set proper permissions
chown -R nginx:nginx /var/log/nginx
chmod 755 /var/log/nginx

# Test Nginx configuration
echo "🧪 Testing Nginx configuration..."
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration is valid"
    
    # Enable and start Nginx
    echo "🚀 Starting Nginx..."
    systemctl enable nginx
    systemctl restart nginx
    
    # Check Nginx status
    echo "📊 Checking Nginx status..."
    systemctl status nginx --no-pager
    
    echo ""
    echo "✅ Backend domain setup complete!"
    echo ""
    echo "Your Django backend is now accessible at:"
    echo "- https://zelton.in/backend/"
    echo "- https://zelton.in/backend/admin/"
    echo "- https://zelton.in/backend/api/"
    echo "- https://api.zelton.in/ (direct API access)"
    echo ""
    echo "Next steps:"
    echo "1. Update your DNS records to point zelton.in to this server's IP"
    echo "2. Replace the self-signed certificate with a real SSL certificate"
    echo "3. Configure your frontend (Vercel) to handle the root domain"
    echo "4. Test the backend endpoints"
else
    echo "❌ Nginx configuration test failed"
    echo "Please check the configuration file"
    exit 1
fi






