#!/usr/bin/env python
"""
Test script to verify production PostgreSQL setup
"""

import os
import sys
import django
from pathlib import Path

# Add the project directory to Python path
project_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(project_dir))

# Set up Django environment with production settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zelton_backend.settings_production')
django.setup()

from django.db import connection
from django.core.management import execute_from_command_line
from django.conf import settings

def test_production_database_connection():
    """Test production PostgreSQL database connection"""
    print("Testing production database connection...")
    
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT version();")
            version = cursor.fetchone()
            print(f"✅ Production database connection successful!")
            print(f"   PostgreSQL version: {version[0]}")
            return True
    except Exception as e:
        print(f"❌ Production database connection failed: {str(e)}")
        return False

def test_production_database_configuration():
    """Test production database configuration"""
    print("\nTesting production database configuration...")
    
    db_config = settings.DATABASES['default']
    print(f"   Engine: {db_config['ENGINE']}")
    print(f"   Database: {db_config['NAME']}")
    print(f"   User: {db_config['USER']}")
    print(f"   Host: {db_config['HOST']}")
    print(f"   Port: {db_config['PORT']}")
    
    if 'postgresql' in db_config['ENGINE']:
        print("✅ Production database configuration is set to PostgreSQL")
        return True
    else:
        print("❌ Production database configuration is not set to PostgreSQL")
        return False

def test_production_media_configuration():
    """Test production media directory configuration"""
    print("\nTesting production media configuration...")
    
    media_root = settings.MEDIA_ROOT
    print(f"   Media root: {media_root}")
    
    if Path(media_root).exists():
        print("✅ Production media directory exists")
        return True
    else:
        print("❌ Production media directory does not exist")
        return False

def test_production_logs_configuration():
    """Test production logs directory configuration"""
    print("\nTesting production logs configuration...")
    
    logs_dir = "/ZeltonLivings/dbdata/logs"
    print(f"   Logs directory: {logs_dir}")
    
    if Path(logs_dir).exists():
        print("✅ Production logs directory exists")
        return True
    else:
        print("❌ Production logs directory does not exist")
        return False

def test_production_database_tables():
    """Test if production database tables exist"""
    print("\nTesting production database tables...")
    
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
                print("✅ Production database tables exist")
                return True
            else:
                print("❌ No production database tables found")
                return False
    except Exception as e:
        print(f"❌ Error checking production database tables: {str(e)}")
        return False

def test_production_migrations():
    """Test production Django migrations"""
    print("\nTesting production Django migrations...")
    
    try:
        # Check if migrations are up to date
        execute_from_command_line(['manage.py', 'showmigrations', '--plan'])
        print("✅ Production Django migrations are working")
        return True
    except Exception as e:
        print(f"❌ Production Django migrations failed: {str(e)}")
        return False

def main():
    """Run all production tests"""
    print("=" * 60)
    print("Production PostgreSQL Setup Test Script")
    print("=" * 60)
    
    tests = [
        ("Production Database Connection", test_production_database_connection),
        ("Production Database Configuration", test_production_database_configuration),
        ("Production Media Configuration", test_production_media_configuration),
        ("Production Logs Configuration", test_production_logs_configuration),
        ("Production Database Tables", test_production_database_tables),
        ("Production Django Migrations", test_production_migrations),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        if test_func():
            passed += 1
        print()
    
    print("=" * 60)
    print(f"Production Test Results: {passed}/{total} tests passed")
    print("=" * 60)
    
    if passed == total:
        print("🎉 All production tests passed! PostgreSQL production setup is working correctly.")
        return True
    else:
        print("⚠️  Some production tests failed. Please check the configuration.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
