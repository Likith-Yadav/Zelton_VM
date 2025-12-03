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
