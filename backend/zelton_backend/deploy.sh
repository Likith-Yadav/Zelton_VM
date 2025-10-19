#!/bin/bash

# Zelton Backend Production Deployment Script
# This script sets up the production environment for Zelton Backend

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/ZeltonLivings/appsdata/backend/zelton_backend"
VENV_DIR="/ZeltonLivings/appsdata/backend/venv"
SERVICE_NAME="zelton-backend"
NGINX_SITE="zelton"

echo -e "${GREEN}🚀 Starting Zelton Backend Production Deployment${NC}"

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

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root for security reasons"
   exit 1
fi

# Check if project directory exists
if [ ! -d "$PROJECT_DIR" ]; then
    print_error "Project directory $PROJECT_DIR not found"
    exit 1
fi

cd "$PROJECT_DIR"

# 1. Install system dependencies
print_status "Installing system dependencies..."
sudo apt update
sudo apt install -y nginx postgresql postgresql-contrib redis-server python3-pip python3-venv python3-dev libpq-dev

# 2. Create necessary directories
print_status "Creating necessary directories..."
sudo mkdir -p /var/log/zelton
sudo mkdir -p /var/run/zelton
sudo mkdir -p /etc/ssl/certs
sudo mkdir -p /etc/ssl/private

# 3. Set up PostgreSQL database
print_status "Setting up PostgreSQL database..."
sudo -u postgres psql << EOF
CREATE DATABASE zelton_production;
CREATE USER zelton_user WITH PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE zelton_production TO zelton_user;
ALTER USER zelton_user CREATEDB;
EOF

# 4. Install Python dependencies
print_status "Installing Python dependencies..."
source "$VENV_DIR/bin/activate"
pip install --upgrade pip
pip install -r requirements.txt

# 5. Install additional production dependencies
print_status "Installing production dependencies..."
pip install psycopg2-binary
pip install django-health-check
pip install sentry-sdk

# 6. Collect static files
print_status "Collecting static files..."
python manage.py collectstatic --noinput --settings=zelton_backend.settings_production

# 7. Run database migrations
print_status "Running database migrations..."
python manage.py migrate --settings=zelton_backend.settings_production

# 8. Set up file permissions
print_status "Setting up file permissions..."
sudo chown -R www-data:www-data "$PROJECT_DIR"
sudo chown -R www-data:www-data /var/log/zelton
sudo chown -R www-data:www-data /var/run/zelton
sudo chmod -R 755 "$PROJECT_DIR"
sudo chmod -R 755 /var/log/zelton
sudo chmod -R 755 /var/run/zelton

# 9. Copy systemd service file
print_status "Setting up systemd service..."
sudo cp zelton-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE_NAME"

# 10. Copy Nginx configuration
print_status "Setting up Nginx configuration..."
sudo cp nginx.conf /etc/nginx/sites-available/"$NGINX_SITE"
sudo ln -sf /etc/nginx/sites-available/"$NGINX_SITE" /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# 11. Test Nginx configuration
print_status "Testing Nginx configuration..."
sudo nginx -t

# 12. Create logrotate configuration
print_status "Setting up log rotation..."
sudo tee /etc/logrotate.d/zelton > /dev/null << EOF
/var/log/zelton/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        systemctl reload zelton-backend
    endscript
}
EOF

# 13. Set up firewall
print_status "Configuring firewall..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# 14. Create production environment file
print_status "Creating production environment file..."
if [ ! -f ".env.production" ]; then
    cp production.env.template .env.production
    print_warning "Please update .env.production with your actual production values"
fi

# 15. Start services
print_status "Starting services..."
sudo systemctl start redis-server
sudo systemctl enable redis-server
sudo systemctl start postgresql
sudo systemctl enable postgresql
sudo systemctl start "$SERVICE_NAME"
sudo systemctl start nginx

# 16. Check service status
print_status "Checking service status..."
sudo systemctl status "$SERVICE_NAME" --no-pager
sudo systemctl status nginx --no-pager

# 17. Set up SSL certificate (Let's Encrypt)
print_status "Setting up SSL certificate..."
sudo apt install -y certbot python3-certbot-nginx
print_warning "Run 'sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com' to get SSL certificate"

# 18. Set up monitoring
print_status "Setting up basic monitoring..."
sudo tee /etc/cron.d/zelton-monitoring > /dev/null << EOF
# Health check every 5 minutes
*/5 * * * * www-data curl -f http://localhost:8000/health/ || systemctl restart zelton-backend

# Log cleanup
0 2 * * * find /var/log/zelton -name "*.log" -mtime +30 -delete
EOF

print_status "Deployment completed successfully!"
print_warning "Next steps:"
echo "1. Update .env.production with your actual values"
echo "2. Get SSL certificate: sudo certbot --nginx -d yourdomain.com"
echo "3. Update DNS records to point to this server"
echo "4. Test the application: curl https://yourdomain.com/health/"
echo "5. Monitor logs: sudo journalctl -u zelton-backend -f"

echo -e "${GREEN}🎉 Zelton Backend is ready for production!${NC}"
