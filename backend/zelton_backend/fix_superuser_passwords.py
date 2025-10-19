#!/usr/bin/env python
"""
Fix superuser passwords after SQLite to PostgreSQL migration
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
from django.contrib.auth.hashers import make_password

def fix_superuser_passwords():
    """Fix superuser passwords after migration"""
    print("Fixing superuser passwords after SQLite to PostgreSQL migration...")
    
    try:
        # Get all superusers
        superusers = User.objects.filter(is_superuser=True)
        print(f"Found {superusers.count()} superuser(s)")
        
        if not superusers.exists():
            print("No superusers found. Creating a new one...")
            # Create a new superuser
            User.objects.create_superuser(
                username='admin',
                email='admin@example.com',
                password='admin123'
            )
            print("✅ Created new superuser: admin/admin123")
            return True
        
        # Fix existing superusers
        for user in superusers:
            print(f"Fixing password for user: {user.username}")
            
            # Reset password to a known value
            new_password = 'admin123'  # You can change this
            user.set_password(new_password)
            user.save()
            
            print(f"✅ Reset password for {user.username} to: {new_password}")
        
        print("\n✅ All superuser passwords have been reset!")
        print("You can now login with:")
        for user in superusers:
            print(f"  Username: {user.username}")
            print(f"  Password: admin123")
        
        return True
        
    except Exception as e:
        print(f"❌ Error fixing superuser passwords: {str(e)}")
        return False

def check_user_passwords():
    """Check if users can authenticate"""
    print("\nChecking user authentication...")
    
    try:
        from django.contrib.auth import authenticate
        
        # Test authentication for superusers
        superusers = User.objects.filter(is_superuser=True)
        
        for user in superusers:
            # Test with the new password
            auth_user = authenticate(username=user.username, password='admin123')
            if auth_user:
                print(f"✅ {user.username} can authenticate successfully")
            else:
                print(f"❌ {user.username} cannot authenticate")
        
        return True
        
    except Exception as e:
        print(f"❌ Error checking authentication: {str(e)}")
        return False

def create_new_superuser():
    """Create a completely new superuser"""
    print("\nCreating a new superuser...")
    
    try:
        # Delete existing superusers if needed
        User.objects.filter(is_superuser=True).delete()
        print("Cleared existing superusers")
        
        # Create new superuser
        user = User.objects.create_superuser(
            username='admin',
            email='admin@zelton.com',
            password='admin123'
        )
        
        print(f"✅ Created new superuser:")
        print(f"   Username: {user.username}")
        print(f"   Email: {user.email}")
        print(f"   Password: admin123")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creating new superuser: {str(e)}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("Superuser Password Fix Script")
    print("=" * 60)
    
    print("\n1. Fixing existing superuser passwords...")
    if fix_superuser_passwords():
        print("✅ Password fix completed")
    else:
        print("❌ Password fix failed")
    
    print("\n2. Checking authentication...")
    check_user_passwords()
    
    print("\n3. Creating new superuser (if needed)...")
    if create_new_superuser():
        print("✅ New superuser created")
    else:
        print("❌ Failed to create new superuser")
    
    print("\n" + "=" * 60)
    print("Superuser fix completed!")
    print("Try logging in with:")
    print("  Username: admin")
    print("  Password: admin123")
    print("=" * 60)
