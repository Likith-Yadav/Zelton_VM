#!/usr/bin/env python
"""
Fix user sequence and create superuser
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
from django.contrib.auth.models import User

def fix_user_sequence():
    """Fix the user sequence after migration"""
    print("Fixing user sequence...")
    
    try:
        with connection.cursor() as cursor:
            # Get the maximum user ID
            cursor.execute("SELECT MAX(id) FROM zelton_schema.auth_user;")
            max_id = cursor.fetchone()[0] or 0
            
            # Reset the sequence to max_id + 1
            cursor.execute(f"SELECT setval('zelton_schema.auth_user_id_seq', {max_id + 1});")
            print(f"✅ User sequence reset to {max_id + 1}")
            
        return True
        
    except Exception as e:
        print(f"❌ Error fixing user sequence: {str(e)}")
        return False

def create_superuser():
    """Create a superuser"""
    print("Creating superuser...")
    
    try:
        # Check if admin user already exists
        if User.objects.filter(username='admin').exists():
            print("Admin user already exists, updating...")
            user = User.objects.get(username='admin')
            user.set_password('admin123')
            user.is_superuser = True
            user.is_staff = True
            user.is_active = True
            user.save()
            print("✅ Admin user updated")
        else:
            # Create new admin user
            user = User.objects.create_user(
                username='admin',
                email='admin@zelton.com',
                password='admin123'
            )
            user.is_superuser = True
            user.is_staff = True
            user.is_active = True
            user.save()
            print("✅ Admin user created")
        
        print(f"Username: admin")
        print(f"Password: admin123")
        print(f"Email: admin@zelton.com")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creating superuser: {str(e)}")
        return False

def test_login():
    """Test the login"""
    print("Testing login...")
    
    try:
        from django.contrib.auth import authenticate
        
        user = authenticate(username='admin', password='admin123')
        if user:
            print("✅ Login successful!")
            print(f"User: {user.username}")
            print(f"Is superuser: {user.is_superuser}")
            print(f"Is staff: {user.is_staff}")
            return True
        else:
            print("❌ Login failed!")
            return False
            
    except Exception as e:
        print(f"❌ Error testing login: {str(e)}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("Fix User Sequence and Create Superuser")
    print("=" * 60)
    
    # Fix sequence
    if fix_user_sequence():
        print("✅ Sequence fixed")
    else:
        print("❌ Sequence fix failed")
    
    # Create superuser
    if create_superuser():
        print("✅ Superuser created/updated")
    else:
        print("❌ Superuser creation failed")
    
    # Test login
    if test_login():
        print("✅ Login test passed")
    else:
        print("❌ Login test failed")
    
    print("\n" + "=" * 60)
    print("You can now login to Django admin with:")
    print("  Username: admin")
    print("  Password: admin123")
    print("  URL: http://localhost:8000/admin/")
    print("=" * 60)
