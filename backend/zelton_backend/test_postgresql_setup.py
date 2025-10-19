#!/usr/bin/env python
"""
Test script to verify PostgreSQL setup and configuration
"""

import os
import sys
import django
from pathlib import Path

# Add the project directory to Python path
project_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(project_dir))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zelton_backend.settings')
django.setup()

from django.db import connection
from django.core.management import execute_from_command_line
from django.conf import settings

def test_database_connection():
    """Test PostgreSQL database connection"""
    print("Testing database connection...")
    
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT version();")
            version = cursor.fetchone()
            print(f"✅ Database connection successful!")
            print(f"   PostgreSQL version: {version[0]}")
            return True
    except Exception as e:
        print(f"❌ Database connection failed: {str(e)}")
        return False

def test_database_configuration():
    """Test database configuration"""
    print("\nTesting database configuration...")
    
    db_config = settings.DATABASES['default']
    print(f"   Engine: {db_config['ENGINE']}")
    print(f"   Database: {db_config['NAME']}")
    print(f"   User: {db_config['USER']}")
    print(f"   Host: {db_config['HOST']}")
    print(f"   Port: {db_config['PORT']}")
    
    if 'postgresql' in db_config['ENGINE']:
        print("✅ Database configuration is set to PostgreSQL")
        return True
    else:
        print("❌ Database configuration is not set to PostgreSQL")
        return False

def test_media_configuration():
    """Test media directory configuration"""
    print("\nTesting media configuration...")
    
    media_root = settings.MEDIA_ROOT
    print(f"   Media root: {media_root}")
    
    if Path(media_root).exists():
        print("✅ Media directory exists")
        
        # Check if it's writable
        if os.access(media_root, os.W_OK):
            print("✅ Media directory is writable")
            return True
        else:
            print("❌ Media directory is not writable")
            return False
    else:
        print("❌ Media directory does not exist")
        return False

def test_logs_configuration():
    """Test logs directory configuration"""
    print("\nTesting logs configuration...")
    
    logs_dir = "/ZeltonLivings/dbdata/logs"
    print(f"   Logs directory: {logs_dir}")
    
    if Path(logs_dir).exists():
        print("✅ Logs directory exists")
        
        # Check if it's writable
        if os.access(logs_dir, os.W_OK):
            print("✅ Logs directory is writable")
            return True
        else:
            print("❌ Logs directory is not writable")
            return False
    else:
        print("❌ Logs directory does not exist")
        return False

def test_django_migrations():
    """Test Django migrations"""
    print("\nTesting Django migrations...")
    
    try:
        # Check if migrations are up to date
        execute_from_command_line(['manage.py', 'showmigrations', '--plan'])
        print("✅ Django migrations are working")
        return True
    except Exception as e:
        print(f"❌ Django migrations failed: {str(e)}")
        return False

def test_database_tables():
    """Test if database tables exist"""
    print("\nTesting database tables...")
    
    try:
        with connection.cursor() as cursor:
            # Get list of tables from both schemas
            cursor.execute("""
                SELECT table_schema, table_name 
                FROM information_schema.tables 
                WHERE table_schema IN ('public', 'zelton_schema')
                ORDER BY table_schema, table_name;
            """)
            tables = cursor.fetchall()
            
            print(f"   Found {len(tables)} tables:")
            for schema, table in tables:
                print(f"     - {schema}.{table}")
            
            if tables:
                print("✅ Database tables exist")
                return True
            else:
                print("❌ No database tables found")
                return False
    except Exception as e:
        print(f"❌ Error checking database tables: {str(e)}")
        return False

def main():
    """Run all tests"""
    print("=" * 60)
    print("PostgreSQL Setup Test Script")
    print("=" * 60)
    
    tests = [
        ("Database Connection", test_database_connection),
        ("Database Configuration", test_database_configuration),
        ("Media Configuration", test_media_configuration),
        ("Logs Configuration", test_logs_configuration),
        ("Django Migrations", test_django_migrations),
        ("Database Tables", test_database_tables),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        if test_func():
            passed += 1
        print()
    
    print("=" * 60)
    print(f"Test Results: {passed}/{total} tests passed")
    print("=" * 60)
    
    if passed == total:
        print("🎉 All tests passed! PostgreSQL setup is working correctly.")
        return True
    else:
        print("⚠️  Some tests failed. Please check the configuration.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
