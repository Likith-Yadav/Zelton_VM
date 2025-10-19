#!/bin/bash

# Simple Setup Script for Option 2: Subdomain Only
# This sets up api.zelton.in to serve your Django backend

echo "=== Zelton Backend Setup (Option 2: Subdomain Only) ==="
echo ""

echo "✅ DNS Configuration:"
echo "   - zelton.in → Vercel (unchanged)"
echo "   - www.zelton.in → Vercel (unchanged)"
echo "   - api.zelton.in → 20.192.27.16 (your server)"
echo ""

echo "📋 Manual Setup Steps:"
echo ""
echo "1. Copy Nginx configuration:"
echo "   sudo cp nginx_subdomain_only.conf /etc/nginx/nginx.conf"
echo ""
echo "2. Generate SSL certificate:"
echo "   sudo mkdir -p /etc/ssl/certs /etc/ssl/private"
echo "   sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \\"
echo "     -keyout /etc/ssl/private/zelton.key \\"
echo "     -out /etc/ssl/certs/zelton.crt \\"
echo "     -subj \"/C=IN/ST=State/L=City/O=Zelton/CN=api.zelton.in\""
echo ""
echo "3. Test Nginx configuration:"
echo "   sudo nginx -t"
echo ""
echo "4. Start/Restart Nginx:"
echo "   sudo systemctl restart nginx"
echo ""
echo "5. Test your backend:"
echo "   curl -I https://api.zelton.in/admin/"
echo ""

echo "🎯 After setup, your backend will be accessible at:"
echo "   - https://api.zelton.in/admin/ (Django admin)"
echo "   - https://api.zelton.in/api/ (API endpoints)"
echo "   - https://api.zelton.in/static/ (Static files)"
echo ""

echo "🌐 Your Vercel frontend remains unchanged:"
echo "   - https://zelton.in/ (Vercel website)"
echo "   - https://www.zelton.in/ (Vercel website)"
echo ""

echo "📝 Current Status:"
echo "   ✅ Django backend running on port 8000"
echo "   ✅ DNS configured for api.zelton.in"
echo "   ⏳ Ready for Nginx setup"



