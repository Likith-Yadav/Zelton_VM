#!/usr/bin/env python
"""
Check all superusers in PostgreSQL database
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

from django.contrib.auth.models import User
from django.db import connection

def check_superusers():
    """Check all superusers in the database"""
    print("Checking all superusers in PostgreSQL database...")
    print("=" * 60)
    
    try:
        # Get all superusers
        superusers = User.objects.filter(is_superuser=True)
        print(f"Found {superusers.count()} superuser(s):")
        print()
        
        if superusers.exists():
            for i, user in enumerate(superusers, 1):
                print(f"{i}. Username: {user.username}")
                print(f"   Email: {user.email}")
                print(f"   First Name: {user.first_name}")
                print(f"   Last Name: {user.last_name}")
                print(f"   Is Superuser: {user.is_superuser}")
                print(f"   Is Staff: {user.is_staff}")
                print(f"   Is Active: {user.is_active}")
                print(f"   Date Joined: {user.date_joined}")
                print(f"   Last Login: {user.last_login}")
                print(f"   User ID: {user.id}")
                print("-" * 40)
        else:
            print("❌ No superusers found in the database")
        
        return superusers
        
    except Exception as e:
        print(f"❌ Error checking superusers: {str(e)}")
        return None

def check_all_users():
    """Check all users in the database"""
    print("\nChecking all users in PostgreSQL database...")
    print("=" * 60)
    
    try:
        # Get all users
        all_users = User.objects.all()
        print(f"Found {all_users.count()} total user(s):")
        print()
        
        for i, user in enumerate(all_users, 1):
            print(f"{i}. Username: {user.username}")
            print(f"   Email: {user.email}")
            print(f"   Is Superuser: {user.is_superuser}")
            print(f"   Is Staff: {user.is_staff}")
            print(f"   Is Active: {user.is_active}")
            print(f"   Date Joined: {user.date_joined}")
            print(f"   User ID: {user.id}")
            print("-" * 30)
        
        return all_users
        
    except Exception as e:
        print(f"❌ Error checking all users: {str(e)}")
        return None

def check_database_users():
    """Check users directly from database"""
    print("\nChecking users directly from PostgreSQL...")
    print("=" * 60)
    
    try:
        with connection.cursor() as cursor:
            # Query users from database
            cursor.execute("""
                SELECT id, username, email, first_name, last_name, 
                       is_superuser, is_staff, is_active, date_joined, last_login
                FROM zelton_schema.auth_user 
                ORDER BY id;
            """)
            
            users = cursor.fetchall()
            print(f"Found {len(users)} user(s) in database:")
            print()
            
            for user in users:
                user_id, username, email, first_name, last_name, is_superuser, is_staff, is_active, date_joined, last_login = user
                print(f"ID: {user_id}")
                print(f"Username: {username}")
                print(f"Email: {email}")
                print(f"Name: {first_name} {last_name}")
                print(f"Is Superuser: {is_superuser}")
                print(f"Is Staff: {is_staff}")
                print(f"Is Active: {is_active}")
                print(f"Date Joined: {date_joined}")
                print(f"Last Login: {last_login}")
                print("-" * 30)
        
        return users
        
    except Exception as e:
        print(f"❌ Error checking database users: {str(e)}")
        return None

def test_user_authentication():
    """Test authentication for each superuser"""
    print("\nTesting authentication for superusers...")
    print("=" * 60)
    
    try:
        from django.contrib.auth import authenticate
        
        superusers = User.objects.filter(is_superuser=True)
        
        if not superusers.exists():
            print("No superusers to test")
            return
        
        for user in superusers:
            print(f"Testing authentication for: {user.username}")
            
            # Test with common passwords
            test_passwords = ['admin123', 'admin', 'password', 'yusha', '123456']
            
            for password in test_passwords:
                auth_user = authenticate(username=user.username, password=password)
                if auth_user:
                    print(f"  ✅ Authentication successful with password: {password}")
                    break
            else:
                print(f"  ❌ Authentication failed with all test passwords")
            
            print("-" * 30)
        
    except Exception as e:
        print(f"❌ Error testing authentication: {str(e)}")

def main():
    """Main function"""
    print("=" * 60)
    print("PostgreSQL Superuser Check")
    print("=" * 60)
    
    # Check superusers
    superusers = check_superusers()
    
    # Check all users
    all_users = check_all_users()
    
    # Check database directly
    db_users = check_database_users()
    
    # Test authentication
    test_user_authentication()
    
    print("\n" + "=" * 60)
    print("Summary:")
    print("=" * 60)
    
    if superusers:
        print(f"✅ Found {superusers.count()} superuser(s)")
        for user in superusers:
            print(f"   - {user.username} (ID: {user.id})")
    else:
        print("❌ No superusers found")
    
    if all_users:
        print(f"✅ Total users in database: {all_users.count()}")
    else:
        print("❌ No users found in database")
    
    print("\nTo create a new superuser, run:")
    print("python manage.py createsuperuser")
    print("=" * 60)

if __name__ == "__main__":
    main()
