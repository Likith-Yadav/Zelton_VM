# Gunicorn configuration file for Zelton Backend Production

import multiprocessing
import os

# Server socket
bind = "127.0.0.1:8000"
backlog = 2048

# Worker processes
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
worker_connections = 1000
timeout = 30
keepalive = 2

# Restart workers after this many requests, to prevent memory leaks
max_requests = 1000
max_requests_jitter = 50

# Logging
accesslog = "/ZeltonLivings/appsdata/backend/zelton_backend/logs/gunicorn_access.log"
errorlog = "/ZeltonLivings/appsdata/backend/zelton_backend/logs/gunicorn_error.log"
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = "zelton_backend"

# Server mechanics
daemon = True
pidfile = "/ZeltonLivings/appsdata/backend/zelton_backend/gunicorn.pid"
user = "zelton"
group = "zelton"
tmp_upload_dir = None

# SSL (if needed for internal communication)
# keyfile = "/path/to/keyfile"
# certfile = "/path/to/certfile"

# Preload app for better performance
preload_app = True

# Environment variables
raw_env = [
    'DJANGO_SETTINGS_MODULE=zelton_backend.settings_production',
]

# Security
limit_request_line = 4094
limit_request_fields = 100
limit_request_field_size = 8190

# Graceful timeout for worker processes
graceful_timeout = 30

# Worker timeout
worker_tmp_dir = "/dev/shm"

# Enable worker recycling
max_worker_connections = 1000

# Capture output
capture_output = True

# Enable worker recycling
worker_max_requests = 1000
worker_max_requests_jitter = 50

# Pre-fork server
def when_ready(server):
    server.log.info("Zelton Backend server is ready. PID: %s", server.pid)

def worker_int(worker):
    worker.log.info("worker received INT or QUIT signal")

def pre_fork(server, worker):
    server.log.info("Worker spawned (pid: %s)", worker.pid)

def post_fork(server, worker):
    server.log.info("Worker spawned (pid: %s)", worker.pid)

def worker_abort(worker):
    worker.log.info("worker received SIGABRT signal")

def on_exit(server):
    server.log.info("Zelton Backend server is shutting down")

def on_reload(server):
    server.log.info("Zelton Backend server is reloading")
