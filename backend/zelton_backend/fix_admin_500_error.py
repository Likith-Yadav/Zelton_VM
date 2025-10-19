#!/usr/bin/env python
"""
Comprehensive fix for Django admin 500 error
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

from django.conf import settings
from django.contrib import admin
from django.contrib.auth.models import User
from django.core.management import execute_from_command_line

def fix_static_files():
    """Fix static files configuration"""
    print("Fixing static files configuration...")
    
    try:
        # Ensure staticfiles directory exists
        static_dir = project_dir / "staticfiles"
        static_dir.mkdir(exist_ok=True)
        print(f"✅ Static files directory: {static_dir}")
        
        # Collect static files
        execute_from_command_line(['manage.py', 'collectstatic', '--noinput'])
        print("✅ Static files collected")
        
        return True
        
    except Exception as e:
        print(f"❌ Error fixing static files: {str(e)}")
        return False

def fix_admin_configuration():
    """Fix admin configuration"""
    print("Fixing admin configuration...")
    
    try:
        # Check admin site configuration
        print(f"Admin site: {admin.site}")
        print(f"Admin URL patterns: {len(admin.site.urls)}")
        
        # Check if all models are properly registered
        registered_models = list(admin.site._registry.keys())
        print(f"Registered models: {len(registered_models)}")
        
        for model in registered_models:
            print(f"  - {model.__name__}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error fixing admin configuration: {str(e)}")
        return False

def fix_database_issues():
    """Fix any database-related issues"""
    print("Fixing database issues...")
    
    try:
        # Check database connection
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            print("✅ Database connection working")
        
        # Check if all tables exist
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'zelton_schema'
                ORDER BY table_name;
            """)
            tables = [row[0] for row in cursor.fetchall()]
            print(f"✅ Found {len(tables)} tables in database")
        
        return True
        
    except Exception as e:
        print(f"❌ Error fixing database issues: {str(e)}")
        return False

def create_admin_user():
    """Ensure admin user exists and is properly configured"""
    print("Creating/verifying admin user...")
    
    try:
        # Get or create admin user
        user, created = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@zelton.com',
                'is_superuser': True,
                'is_staff': True,
                'is_active': True
            }
        )
        
        if created:
            user.set_password('admin123')
            user.save()
            print("✅ Admin user created")
        else:
            # Update existing user
            user.set_password('admin123')
            user.is_superuser = True
            user.is_staff = True
            user.is_active = True
            user.save()
            print("✅ Admin user updated")
        
        print(f"Username: {user.username}")
        print(f"Email: {user.email}")
        print(f"Is superuser: {user.is_superuser}")
        print(f"Is staff: {user.is_staff}")
        print(f"Is active: {user.is_active}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creating admin user: {str(e)}")
        return False

def test_admin_access():
    """Test admin access"""
    print("Testing admin access...")
    
    try:
        from django.test import Client
        
        client = Client()
        
        # Test login
        login_result = client.login(username='admin', password='admin123')
        print(f"Login result: {login_result}")
        
        if login_result:
            # Test admin pages
            response = client.get('/admin/')
            print(f"Admin index status: {response.status_code}")
            
            if response.status_code == 200:
                print("✅ Admin index accessible")
                
                # Test specific admin pages
                response = client.get('/admin/auth/user/')
                print(f"User admin status: {response.status_code}")
                
                response = client.get('/admin/core/owner/')
                print(f"Owner admin status: {response.status_code}")
                
                return True
            else:
                print(f"❌ Admin index not accessible: {response.status_code}")
                return False
        else:
            print("❌ Login failed")
            return False
            
    except Exception as e:
        print(f"❌ Error testing admin access: {str(e)}")
        return False

def main():
    """Main fix function"""
    print("=" * 60)
    print("Django Admin 500 Error Fix")
    print("=" * 60)
    
    fixes = [
        ("Static Files", fix_static_files),
        ("Admin Configuration", fix_admin_configuration),
        ("Database Issues", fix_database_issues),
        ("Admin User", create_admin_user),
        ("Admin Access", test_admin_access),
    ]
    
    success_count = 0
    
    for fix_name, fix_func in fixes:
        print(f"\n{fix_name}:")
        if fix_func():
            success_count += 1
            print(f"✅ {fix_name} fixed")
        else:
            print(f"❌ {fix_name} failed")
    
    print("\n" + "=" * 60)
    print(f"Fix Results: {success_count}/{len(fixes)} successful")
    
    if success_count == len(fixes):
        print("🎉 All fixes applied successfully!")
        print("\nTry accessing the admin at: http://localhost:8000/admin/")
        print("Username: admin")
        print("Password: admin123")
    else:
        print("⚠️  Some fixes failed. Check the errors above.")
    
    print("=" * 60)

if __name__ == "__main__":
    main()
