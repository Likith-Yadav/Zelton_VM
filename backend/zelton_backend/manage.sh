#!/bin/bash

# Zelton Backend Management Script
# This script provides easy management commands for the production backend

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
SERVICE_NAME="zelton-backend"

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
    echo "  deploy      Deploy latest code"
    echo "  migrate     Run database migrations"
    echo "  collect     Collect static files"
    echo "  shell       Open Django shell"
    echo "  test        Run tests"
    echo "  backup      Backup database"
    echo "  restore     Restore database from backup"
    echo "  ssl         Setup SSL certificate"
    echo "  monitor     Show system monitoring"
    echo "  health      Check application health"
    echo ""
}

# Function to start service
start_service() {
    print_info "Starting Zelton Backend service..."
    sudo systemctl start "$SERVICE_NAME"
    sudo systemctl start nginx
    print_status "Services started successfully"
}

# Function to stop service
stop_service() {
    print_info "Stopping Zelton Backend service..."
    sudo systemctl stop "$SERVICE_NAME"
    sudo systemctl stop nginx
    print_status "Services stopped successfully"
}

# Function to restart service
restart_service() {
    print_info "Restarting Zelton Backend service..."
    sudo systemctl restart "$SERVICE_NAME"
    sudo systemctl restart nginx
    print_status "Services restarted successfully"
}

# Function to show status
show_status() {
    print_info "Service Status:"
    echo ""
    sudo systemctl status "$SERVICE_NAME" --no-pager
    echo ""
    sudo systemctl status nginx --no-pager
}

# Function to show logs
show_logs() {
    print_info "Showing recent logs..."
    sudo journalctl -u "$SERVICE_NAME" -n 50 --no-pager
}

# Function to deploy
deploy() {
    print_info "Deploying latest code..."
    cd "$PROJECT_DIR"
    
    # Pull latest code (if using git)
    if [ -d ".git" ]; then
        git pull origin main
    fi
    
    # Activate virtual environment
    source "$VENV_DIR/bin/activate"
    
    # Install/update dependencies
    pip install -r requirements.txt
    
    # Collect static files
    python manage.py collectstatic --noinput --settings=zelton_backend.settings_production
    
    # Run migrations
    python manage.py migrate --settings=zelton_backend.settings_production
    
    # Restart service
    sudo systemctl restart "$SERVICE_NAME"
    
    print_status "Deployment completed successfully"
}

# Function to run migrations
run_migrations() {
    print_info "Running database migrations..."
    cd "$PROJECT_DIR"
    source "$VENV_DIR/bin/activate"
    python manage.py migrate --settings=zelton_backend.settings_production
    print_status "Migrations completed successfully"
}

# Function to collect static files
collect_static() {
    print_info "Collecting static files..."
    cd "$PROJECT_DIR"
    source "$VENV_DIR/bin/activate"
    python manage.py collectstatic --noinput --settings=zelton_backend.settings_production
    print_status "Static files collected successfully"
}

# Function to open Django shell
open_shell() {
    print_info "Opening Django shell..."
    cd "$PROJECT_DIR"
    source "$VENV_DIR/bin/activate"
    python manage.py shell --settings=zelton_backend.settings_production
}

# Function to run tests
run_tests() {
    print_info "Running tests..."
    cd "$PROJECT_DIR"
    source "$VENV_DIR/bin/activate"
    python manage.py test --settings=zelton_backend.settings_production
    print_status "Tests completed"
}

# Function to backup database
backup_database() {
    print_info "Creating database backup..."
    BACKUP_FILE="/var/backups/zelton_backup_$(date +%Y%m%d_%H%M%S).sql"
    sudo mkdir -p /var/backups
    sudo -u postgres pg_dump zelton_production > "$BACKUP_FILE"
    print_status "Database backup created: $BACKUP_FILE"
}

# Function to restore database
restore_database() {
    if [ -z "$1" ]; then
        print_error "Please provide backup file path"
        echo "Usage: $0 restore /path/to/backup.sql"
        exit 1
    fi
    
    print_warning "This will replace the current database. Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        print_info "Restoring database from $1..."
        sudo -u postgres psql zelton_production < "$1"
        print_status "Database restored successfully"
    else
        print_info "Database restore cancelled"
    fi
}

# Function to setup SSL
setup_ssl() {
    print_info "Setting up SSL certificate..."
    print_warning "Make sure your domain is pointing to this server first"
    sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
    print_status "SSL certificate setup completed"
}

# Function to show monitoring
show_monitoring() {
    print_info "System Monitoring:"
    echo ""
    echo "=== CPU Usage ==="
    top -bn1 | grep "Cpu(s)"
    echo ""
    echo "=== Memory Usage ==="
    free -h
    echo ""
    echo "=== Disk Usage ==="
    df -h
    echo ""
    echo "=== Service Status ==="
    sudo systemctl is-active "$SERVICE_NAME" nginx postgresql redis-server
    echo ""
    echo "=== Recent Errors ==="
    sudo journalctl -u "$SERVICE_NAME" --since "1 hour ago" | grep -i error | tail -5
}

# Function to check health
check_health() {
    print_info "Checking application health..."
    
    # Check if service is running
    if sudo systemctl is-active --quiet "$SERVICE_NAME"; then
        print_status "Backend service is running"
    else
        print_error "Backend service is not running"
    fi
    
    # Check if nginx is running
    if sudo systemctl is-active --quiet nginx; then
        print_status "Nginx is running"
    else
        print_error "Nginx is not running"
    fi
    
    # Check database connection
    cd "$PROJECT_DIR"
    source "$VENV_DIR/bin/activate"
    if python manage.py check --settings=zelton_backend.settings_production > /dev/null 2>&1; then
        print_status "Database connection is healthy"
    else
        print_error "Database connection failed"
    fi
    
    # Check Redis connection
    if redis-cli ping > /dev/null 2>&1; then
        print_status "Redis is running"
    else
        print_error "Redis is not running"
    fi
    
    # Check HTTP response
    if curl -f http://localhost:8000/health/ > /dev/null 2>&1; then
        print_status "Application is responding to HTTP requests"
    else
        print_error "Application is not responding to HTTP requests"
    fi
}

# Main script logic
case "$1" in
    start)
        start_service
        ;;
    stop)
        stop_service
        ;;
    restart)
        restart_service
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    deploy)
        deploy
        ;;
    migrate)
        run_migrations
        ;;
    collect)
        collect_static
        ;;
    shell)
        open_shell
        ;;
    test)
        run_tests
        ;;
    backup)
        backup_database
        ;;
    restore)
        restore_database "$2"
        ;;
    ssl)
        setup_ssl
        ;;
    monitor)
        show_monitoring
        ;;
    health)
        check_health
        ;;
    *)
        show_usage
        exit 1
        ;;
esac
