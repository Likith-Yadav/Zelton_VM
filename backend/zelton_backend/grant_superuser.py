#!/usr/bin/env python
"""
Grant superuser privileges to zelton_user
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

def grant_superuser():
    """Grant superuser privileges"""
    print("Granting superuser privileges to zelton_user...")
    
    try:
        with connection.cursor() as cursor:
            # Make user a superuser
            cursor.execute("ALTER USER zelton_user WITH SUPERUSER;")
            print("✓ Granted superuser privileges")
            
            # Grant all privileges on database
            cursor.execute("GRANT ALL PRIVILEGES ON DATABASE zelton_db TO zelton_user;")
            print("✓ Granted database privileges")
            
            # Grant all privileges on schema
            cursor.execute("GRANT ALL ON SCHEMA public TO zelton_user;")
            print("✓ Granted schema privileges")
            
            print("✅ Superuser privileges granted successfully!")
            return True
            
    except Exception as e:
        print(f"❌ Error granting superuser privileges: {str(e)}")
        return False

if __name__ == "__main__":
    print("=" * 50)
    print("Grant Superuser Privileges")
    print("=" * 50)
    
    if grant_superuser():
        print("\n✅ Superuser privileges granted!")
        print("You can now run migrations.")
    else:
        print("\n❌ Failed to grant superuser privileges!")
        sys.exit(1)
