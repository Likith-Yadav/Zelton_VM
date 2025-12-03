#!/bin/bash
# Fix systemd service to properly manage gunicorn
# Run with: sudo bash /ZeltonLivings/appsdata/fix_backend_service.sh

set -e

echo "Fixing zelton-backend systemd service..."

# Stop the service first
systemctl stop zelton-backend.service 2>/dev/null || true

# Kill any existing gunicorn processes
pkill -f "gunicorn.*zelton_backend.wsgi" || true
sleep 2

# Create a wrapper script that ensures gunicorn runs properly
cat > /ZeltonLivings/appsdata/backend/zelton_backend/start_gunicorn.sh << 'WRAPPER_EOF'
#!/bin/bash
# Wrapper script to start gunicorn for systemd

cd /ZeltonLivings/appsdata/backend/zelton_backend
source /ZeltonLivings/appsdata/backend/venv/bin/activate

# Ensure log directory exists
mkdir -p /ZeltonLivings/appsdata/backend/zelton_backend/logs

# Remove old PID file if exists
rm -f /ZeltonLivings/appsdata/backend/zelton_backend/gunicorn.pid

# Start gunicorn in foreground (not daemon) so systemd can track it
exec /ZeltonLivings/appsdata/backend/venv/bin/gunicorn \
    --bind 127.0.0.1:8000 \
    --workers 3 \
    --worker-class sync \
    --timeout 30 \
    --keep-alive 2 \
    --max-requests 1000 \
    --max-requests-jitter 50 \
    --access-logfile /ZeltonLivings/appsdata/backend/zelton_backend/logs/gunicorn_access.log \
    --error-logfile /ZeltonLivings/appsdata/backend/zelton_backend/logs/gunicorn_error.log \
    --log-level info \
    --pid /ZeltonLivings/appsdata/backend/zelton_backend/gunicorn.pid \
    --preload \
    --capture-output \
    --enable-stdio-inheritance \
    --env DJANGO_SETTINGS_MODULE=zelton_backend.settings_production \
    zelton_backend.wsgi:application
WRAPPER_EOF

chmod +x /ZeltonLivings/appsdata/backend/zelton_backend/start_gunicorn.sh
chown zelton:zelton /ZeltonLivings/appsdata/backend/zelton_backend/start_gunicorn.sh

# Update systemd service file
cat > /etc/systemd/system/zelton-backend.service << 'SERVICE_EOF'
[Unit]
Description=Zelton Backend (Gunicorn)
After=network.target

[Service]
Type=simple
User=zelton
Group=zelton
WorkingDirectory=/ZeltonLivings/appsdata/backend/zelton_backend
ExecStart=/ZeltonLivings/appsdata/backend/zelton_backend/start_gunicorn.sh
ExecReload=/bin/kill -s HUP $MAINPID
KillMode=mixed
KillSignal=SIGTERM
TimeoutStopSec=30
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=zelton-backend

# Environment
Environment="PATH=/ZeltonLivings/appsdata/backend/venv/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
Environment="DJANGO_SETTINGS_MODULE=zelton_backend.settings_production"

# Security
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
SERVICE_EOF

# Reload systemd
systemctl daemon-reload

echo ""
echo "✓ Service file updated"
echo ""
echo "Starting service..."
systemctl start zelton-backend.service

sleep 3

echo ""
echo "Checking status..."
systemctl status zelton-backend.service --no-pager | head -20

echo ""
echo "✓ Service configured and started"
echo ""
echo "Enable auto-start on boot:"
echo "  sudo systemctl enable zelton-backend.service"
echo ""
echo "Check if backend is running on port 8000:"
echo "  ss -tlnp | grep :8000"

