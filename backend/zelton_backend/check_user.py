#!/usr/bin/env python
"""
Check current database user and permissions
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

def check_user_and_permissions():
    """Check current user and permissions"""
    print("Checking database user and permissions...")
    
    try:
        with connection.cursor() as cursor:
            # Check current user
            cursor.execute("SELECT current_user, session_user;")
            current_user, session_user = cursor.fetchone()
            print(f"Current user: {current_user}")
            print(f"Session user: {session_user}")
            
            # Check if user can create tables
            cursor.execute("SELECT has_database_privilege(current_user, current_database(), 'CREATE');")
            can_create = cursor.fetchone()[0]
            print(f"Can create in database: {can_create}")
            
            # Check schema permissions
            cursor.execute("""
                SELECT schema_name, privilege_type 
                FROM information_schema.schema_privileges 
                WHERE grantee = current_user AND schema_name = 'public';
            """)
            schema_perms = cursor.fetchall()
            print(f"Schema permissions: {schema_perms}")
            
            # Check if we can create tables in public schema
            cursor.execute("SELECT has_schema_privilege(current_user, 'public', 'CREATE');")
            can_create_schema = cursor.fetchone()[0]
            print(f"Can create in public schema: {can_create_schema}")
            
            # Try to create a test table
            try:
                cursor.execute("CREATE TABLE test_permissions (id SERIAL PRIMARY KEY);")
                cursor.execute("DROP TABLE test_permissions;")
                print("✅ Can create and drop tables")
            except Exception as e:
                print(f"❌ Cannot create tables: {e}")
            
            return True
            
    except Exception as e:
        print(f"❌ Error checking permissions: {str(e)}")
        return False

if __name__ == "__main__":
    print("=" * 50)
    print("Database User and Permissions Check")
    print("=" * 50)
    
    check_user_and_permissions()
