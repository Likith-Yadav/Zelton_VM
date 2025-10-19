#!/bin/bash

# PostgreSQL Setup Script for ZeltonLivings
# This script sets up PostgreSQL and migrates data from SQLite

echo "=========================================="
echo "ZeltonLivings PostgreSQL Setup Script"
echo "=========================================="

# Database configuration
DB_NAME="zelton_db"
DB_USER="zelton_user"
DB_PASSWORD="Zelton@12345"
DB_DATA_DIR="/ZeltonLivings/dbdata"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root for security reasons"
   exit 1
fi

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    print_error "PostgreSQL is not installed. Please install PostgreSQL first."
    echo "On Ubuntu/Debian: sudo apt-get install postgresql postgresql-contrib"
    echo "On CentOS/RHEL: sudo yum install postgresql postgresql-server"
    exit 1
fi

print_status "PostgreSQL is installed"

# Check if PostgreSQL service is running
if ! systemctl is-active --quiet postgresql; then
    print_warning "PostgreSQL service is not running. Starting it..."
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
fi

print_status "PostgreSQL service is running"

# Create database directory if it doesn't exist
if [ ! -d "$DB_DATA_DIR" ]; then
    print_status "Creating database directory: $DB_DATA_DIR"
    sudo mkdir -p "$DB_DATA_DIR"
    sudo chown -R postgres:postgres "$DB_DATA_DIR"
    sudo chmod 700 "$DB_DATA_DIR"
fi

# Create database and user
print_status "Setting up database and user..."

# Switch to postgres user to create database and user
sudo -u postgres psql << EOF
-- Create user if it doesn't exist
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$DB_USER') THEN
        CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
    END IF;
END
\$\$;

-- Create database if it doesn't exist
SELECT 'CREATE DATABASE $DB_NAME OWNER $DB_USER'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER USER $DB_USER CREATEDB;
EOF

if [ $? -eq 0 ]; then
    print_status "Database and user created successfully"
else
    print_error "Failed to create database or user"
    exit 1
fi

# Test database connection
print_status "Testing database connection..."
if PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c "SELECT version();" > /dev/null 2>&1; then
    print_status "Database connection successful"
else
    print_error "Failed to connect to database"
    exit 1
fi

# Install Python dependencies if not already installed
print_status "Installing Python dependencies..."
cd "$(dirname "$0")"

if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
    if [ $? -eq 0 ]; then
        print_status "Python dependencies installed successfully"
    else
        print_error "Failed to install Python dependencies"
        exit 1
    fi
else
    print_warning "requirements.txt not found, skipping dependency installation"
fi

# Run Django migrations
print_status "Running Django migrations..."
python manage.py migrate

if [ $? -eq 0 ]; then
    print_status "Django migrations completed successfully"
else
    print_error "Django migrations failed"
    exit 1
fi

# Run data migration script
print_status "Running data migration from SQLite to PostgreSQL..."
python migrate_to_postgresql.py

if [ $? -eq 0 ]; then
    print_status "Data migration completed successfully"
else
    print_warning "Data migration failed or no SQLite data to migrate"
fi

# Create superuser if it doesn't exist
print_status "Checking for superuser..."
python manage.py shell << EOF
from django.contrib.auth.models import User
if not User.objects.filter(is_superuser=True).exists():
    print("No superuser found. Creating one...")
    User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
    print("Superuser created: username=admin, password=admin123")
else:
    print("Superuser already exists")
EOF

# Set proper permissions for the database directory
print_status "Setting up directory permissions..."
sudo chown -R postgres:postgres "$DB_DATA_DIR"
sudo chmod -R 700 "$DB_DATA_DIR"

# Create logs directory
mkdir -p "$DB_DATA_DIR/logs"
sudo chown -R postgres:postgres "$DB_DATA_DIR/logs"
sudo chmod -R 755 "$DB_DATA_DIR/logs"

print_status "=========================================="
print_status "PostgreSQL setup completed successfully!"
print_status "=========================================="
print_status "Database: $DB_NAME"
print_status "User: $DB_USER"
print_status "Data Directory: $DB_DATA_DIR"
print_status "Media Directory: $DB_DATA_DIR/media"
print_status "Logs Directory: $DB_DATA_DIR/logs"
print_status "=========================================="
print_status "You can now start your Django application with:"
print_status "python manage.py runserver"
print_status "=========================================="
