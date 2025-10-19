#!/bin/bash

# Domain Setup Script for Zelton Backend
# This script helps set up the domain connection for your Django backend

echo "=== Zelton Backend Domain Setup ==="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script needs to be run as root (use sudo)"
    echo "Please run: sudo ./setup_domain.sh"
    exit 1
fi

echo "✅ Running as root"

# Install Nginx
echo "📦 Installing Nginx..."
dnf install -y nginx

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

# Copy Nginx configuration
echo "⚙️  Setting up Nginx configuration..."
cp nginx.conf /etc/nginx/nginx.conf

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

# Enable and start Nginx
echo "🚀 Starting Nginx..."
systemctl enable nginx
systemctl start nginx

# Check Nginx status
echo "📊 Checking Nginx status..."
systemctl status nginx --no-pager

echo ""
echo "✅ Domain setup complete!"
echo ""
echo "Next steps:"
echo "1. Update your DNS records to point zelton.in to this server's IP"
echo "2. Replace the self-signed certificate with a real SSL certificate"
echo "3. Test the domain connection"
echo ""
echo "Your Django backend should now be accessible at:"
echo "- https://zelton.in"
echo "- https://api.zelton.in"
echo "- https://zelton.in/admin/"
