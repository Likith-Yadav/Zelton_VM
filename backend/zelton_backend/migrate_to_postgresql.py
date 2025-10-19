#!/usr/bin/env python
"""
Migration script to transfer data from SQLite to PostgreSQL
Run this script after setting up PostgreSQL database
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

import sqlite3
from django.db import connection
from django.core.management import execute_from_command_line
from django.contrib.auth.models import User
from core.models import *  # Import all your models

def migrate_sqlite_to_postgresql():
    """
    Migrate data from SQLite to PostgreSQL
    """
    print("Starting migration from SQLite to PostgreSQL...")
    
    # Path to the SQLite database
    sqlite_db_path = project_dir / "db.sqlite3"
    
    if not sqlite_db_path.exists():
        print(f"SQLite database not found at {sqlite_db_path}")
        return False
    
    try:
        # Connect to SQLite database
        sqlite_conn = sqlite3.connect(str(sqlite_db_path))
        sqlite_cursor = sqlite_conn.cursor()
        
        print("Connected to SQLite database")
        
        # First, run Django migrations to create PostgreSQL tables
        print("Running Django migrations on PostgreSQL...")
        execute_from_command_line(['manage.py', 'migrate'])
        
        # Get all table names from SQLite
        sqlite_cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
        tables = [row[0] for row in sqlite_cursor.fetchall()]
        
        print(f"Found {len(tables)} tables to migrate: {tables}")
        
        # Define migration order to respect foreign key constraints
        migration_order = [
            'django_content_type',
            'auth_user',
            'auth_group',
            'auth_permission',
            'auth_group_permissions',
            'auth_user_groups',
            'auth_user_user_permissions',
            'authtoken_token',
            'core_pricingplan',
            'core_owner',
            'core_property',
            'core_unit',
            'core_tenant',
            'core_payment',
            'core_paymenttransaction',
            'core_paymentproof',
            'core_invoice',
            'core_ownersubscriptionpayment',
            'core_propertyimage',
            'core_unitimage',
            'core_tenantkey',
            'core_tenantdocument',
            'django_admin_log',
            'django_session',
        ]
        
        # Migrate tables in the correct order
        for table_name in migration_order:
            if table_name not in tables:
                continue
                
            print(f"Migrating table: {table_name}")
            
            # Get all data from SQLite table
            sqlite_cursor.execute(f"SELECT * FROM {table_name}")
            rows = sqlite_cursor.fetchall()
            
            if not rows:
                print(f"  No data in {table_name}")
                continue
            
            # Get column names and types
            sqlite_cursor.execute(f"PRAGMA table_info({table_name})")
            column_info = sqlite_cursor.fetchall()
            columns = [row[1] for row in column_info]
            column_types = [row[2] for row in column_info]
            
            print(f"  Found {len(rows)} rows with columns: {columns}")
            
            # Convert data types for PostgreSQL compatibility
            converted_rows = []
            for row in rows:
                converted_row = []
                for i, value in enumerate(row):
                    if value is None:
                        converted_row.append(None)
                    elif column_types[i].upper() == 'BOOLEAN' or 'is_' in columns[i].lower() or 'has_' in columns[i].lower():
                        # Convert SQLite boolean (0/1) to PostgreSQL boolean
                        converted_row.append(bool(value))
                    else:
                        converted_row.append(value)
                converted_rows.append(converted_row)
            
            # Insert data into PostgreSQL
            with connection.cursor() as cursor:
                # Create placeholders for the INSERT statement
                placeholders = ', '.join(['%s'] * len(columns))
                column_names = ', '.join(columns)
                
                # Clear existing data in PostgreSQL table using TRUNCATE CASCADE
                try:
                    cursor.execute(f"TRUNCATE TABLE {table_name} CASCADE;")
                except Exception as e:
                    # If TRUNCATE fails, try DELETE
                    print(f"    TRUNCATE failed, trying DELETE: {e}")
                    cursor.execute(f"DELETE FROM {table_name}")
                
                # Insert data
                insert_query = f"INSERT INTO {table_name} ({column_names}) VALUES ({placeholders})"
                cursor.executemany(insert_query, converted_rows)
                
                print(f"  Successfully migrated {len(converted_rows)} rows to PostgreSQL")
        
        sqlite_conn.close()
        print("Migration completed successfully!")
        return True
        
    except Exception as e:
        print(f"Error during migration: {str(e)}")
        return False

def migrate_media_files():
    """
    Move media files to the new directory
    """
    print("Migrating media files...")
    
    old_media_dir = project_dir / "media"
    new_media_dir = Path("/ZeltonLivings/dbdata/media")
    
    if not old_media_dir.exists():
        print("No media directory found in project")
        return True
    
    try:
        # Create new media directory if it doesn't exist
        new_media_dir.mkdir(parents=True, exist_ok=True)
        
        # Copy all files from old to new media directory
        import shutil
        if old_media_dir.exists():
            for item in old_media_dir.iterdir():
                if item.is_file():
                    shutil.copy2(item, new_media_dir / item.name)
                elif item.is_dir():
                    shutil.copytree(item, new_media_dir / item.name, dirs_exist_ok=True)
        
        print(f"Media files migrated to {new_media_dir}")
        return True
        
    except Exception as e:
        print(f"Error migrating media files: {str(e)}")
        return False

if __name__ == "__main__":
    print("=" * 50)
    print("SQLite to PostgreSQL Migration Script")
    print("=" * 50)
    
    # Migrate database data
    if migrate_sqlite_to_postgresql():
        print("Database migration completed successfully!")
    else:
        print("Database migration failed!")
        sys.exit(1)
    
    # Migrate media files
    if migrate_media_files():
        print("Media files migration completed successfully!")
    else:
        print("Media files migration failed!")
        sys.exit(1)
    
    print("=" * 50)
    print("Migration completed successfully!")
    print("You can now remove the old SQLite database file if everything works correctly.")
    print("=" * 50)
