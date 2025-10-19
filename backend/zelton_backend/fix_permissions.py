#!/usr/bin/env python
"""
Fix PostgreSQL permissions for zelton_user
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

def fix_permissions():
    """Fix PostgreSQL permissions for the user"""
    print("Fixing PostgreSQL permissions...")
    
    try:
        with connection.cursor() as cursor:
            # Grant permissions on schema
            cursor.execute("GRANT ALL ON SCHEMA public TO zelton_user;")
            print("✓ Granted schema permissions")
            
            # Grant permissions on existing tables
            cursor.execute("GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO zelton_user;")
            print("✓ Granted table permissions")
            
            # Grant permissions on sequences
            cursor.execute("GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO zelton_user;")
            print("✓ Granted sequence permissions")
            
            # Set default privileges for future tables
            cursor.execute("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO zelton_user;")
            print("✓ Set default table privileges")
            
            # Set default privileges for future sequences
            cursor.execute("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO zelton_user;")
            print("✓ Set default sequence privileges")
            
            print("✅ All permissions granted successfully!")
            return True
            
    except Exception as e:
        print(f"❌ Error fixing permissions: {str(e)}")
        return False

if __name__ == "__main__":
    print("=" * 50)
    print("PostgreSQL Permissions Fix Script")
    print("=" * 50)
    
    if fix_permissions():
        print("\n✅ Permissions fixed successfully!")
        print("You can now run migrations.")
    else:
        print("\n❌ Failed to fix permissions!")
        sys.exit(1)
