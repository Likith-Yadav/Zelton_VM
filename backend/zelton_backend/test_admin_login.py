#!/usr/bin/env python
"""
Test Django admin login after password fix
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

from django.contrib.auth import authenticate
from django.contrib.auth.models import User

def test_admin_login():
    """Test Django admin login"""
    print("Testing Django admin login...")
    
    try:
        # Get superusers
        superusers = User.objects.filter(is_superuser=True)
        print(f"Found {superusers.count()} superuser(s)")
        
        for user in superusers:
            print(f"\nTesting login for: {user.username}")
            print(f"  Email: {user.email}")
            print(f"  Is superuser: {user.is_superuser}")
            print(f"  Is staff: {user.is_staff}")
            print(f"  Is active: {user.is_active}")
            
            # Test authentication
            auth_user = authenticate(username=user.username, password='admin123')
            if auth_user:
                print(f"  ✅ Authentication successful!")
                print(f"  ✅ User can login to Django admin")
            else:
                print(f"  ❌ Authentication failed!")
                
                # Try with different passwords
                test_passwords = ['admin123', 'admin', 'password', 'yusha']
                for pwd in test_passwords:
                    auth_user = authenticate(username=user.username, password=pwd)
                    if auth_user:
                        print(f"  ✅ Authentication successful with password: {pwd}")
                        break
                else:
                    print(f"  ❌ No password worked")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing admin login: {str(e)}")
        return False

def show_login_instructions():
    """Show login instructions"""
    print("\n" + "=" * 60)
    print("Django Admin Login Instructions")
    print("=" * 60)
    
    superusers = User.objects.filter(is_superuser=True)
    
    if superusers.exists():
        print("You can login to Django admin with:")
        for user in superusers:
            print(f"  Username: {user.username}")
            print(f"  Password: admin123")
            print(f"  Admin URL: http://localhost:8000/admin/")
    else:
        print("No superusers found. Please create one first.")
    
    print("\nIf you still can't login:")
    print("1. Make sure the Django server is running")
    print("2. Check that you're using the correct URL")
    print("3. Try clearing your browser cache/cookies")
    print("4. Check Django logs for any errors")
    print("=" * 60)

if __name__ == "__main__":
    print("=" * 60)
    print("Django Admin Login Test")
    print("=" * 60)
    
    test_admin_login()
    show_login_instructions()
