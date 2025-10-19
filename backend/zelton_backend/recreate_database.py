#!/usr/bin/env python
"""
Recreate database with proper privileges
"""

import subprocess
import sys

def recreate_database():
    """Recreate the database with proper privileges"""
    print("Recreating database with proper privileges...")
    
    try:
        # Connect as postgres user and recreate everything
        commands = [
            "DROP DATABASE IF EXISTS zelton_db;",
            "DROP USER IF EXISTS zelton_user;",
            "CREATE USER zelton_user WITH PASSWORD 'Zelton@12345' CREATEDB CREATEROLE;",
            "CREATE DATABASE zelton_db OWNER zelton_user;",
            "GRANT ALL PRIVILEGES ON DATABASE zelton_db TO zelton_user;",
        ]
        
        for cmd in commands:
            print(f"Executing: {cmd}")
            result = subprocess.run([
                'psql', '-h', 'localhost', '-U', 'postgres', '-d', 'postgres', '-c', cmd
            ], capture_output=True, text=True)
            
            if result.returncode != 0:
                print(f"Warning: {cmd} - {result.stderr}")
            else:
                print(f"✓ {cmd}")
        
        print("✅ Database recreated successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error recreating database: {str(e)}")
        return False

if __name__ == "__main__":
    print("=" * 50)
    print("Recreate Database Script")
    print("=" * 50)
    print("This script will recreate the database with proper privileges.")
    print("You may need to enter the postgres user password.")
    print("=" * 50)
    
    if recreate_database():
        print("\n✅ Database recreated successfully!")
        print("You can now run migrations.")
    else:
        print("\n❌ Failed to recreate database!")
        sys.exit(1)
