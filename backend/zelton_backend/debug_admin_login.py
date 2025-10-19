#!/usr/bin/env python
"""
Debug admin login and test the full login flow
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

from django.test import Client
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.urls import reverse

def debug_admin_login():
    """Debug the admin login process"""
    print("Debugging admin login process...")
    
    try:
        # Test authentication
        user = authenticate(username='admin', password='admin123')
        print(f"✅ Authentication successful: {user}")
        
        # Create client
        client = Client()
        
        # Test login
        login_result = client.login(username='admin', password='admin123')
        print(f"✅ Client login successful: {login_result}")
        
        # Test admin index
        print("\nTesting admin index...")
        response = client.get('/admin/')
        print(f"Admin index status: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ Admin index loads successfully")
        else:
            print(f"❌ Admin index failed: {response.status_code}")
            print(f"Response content: {response.content[:500]}")
        
        # Test admin login page
        print("\nTesting admin login page...")
        response = client.get('/admin/login/')
        print(f"Admin login page status: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ Admin login page loads successfully")
        else:
            print(f"❌ Admin login page failed: {response.status_code}")
        
        # Test POST to admin login
        print("\nTesting POST to admin login...")
        response = client.post('/admin/login/', {
            'username': 'admin',
            'password': 'admin123',
            'next': '/admin/'
        })
        print(f"Admin login POST status: {response.status_code}")
        
        if response.status_code == 302:
            print("✅ Admin login POST successful (redirect)")
            # Follow redirect
            response = client.get(response.url)
            print(f"After redirect status: {response.status_code}")
            if response.status_code == 200:
                print("✅ Admin dashboard loads successfully")
            else:
                print(f"❌ Admin dashboard failed: {response.status_code}")
                print(f"Response content: {response.content[:500]}")
        else:
            print(f"❌ Admin login POST failed: {response.status_code}")
            print(f"Response content: {response.content[:500]}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error during debug: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def check_admin_configuration():
    """Check admin configuration"""
    print("\nChecking admin configuration...")
    
    try:
        from django.contrib import admin
        from django.apps import apps
        
        # Check if admin is properly configured
        print(f"Admin site: {admin.site}")
        print(f"Admin apps: {admin.site._registry}")
        
        # Check installed apps
        from django.conf import settings
        print(f"Installed apps: {settings.INSTALLED_APPS}")
        
        # Check if core app is registered
        if 'core' in settings.INSTALLED_APPS:
            print("✅ Core app is installed")
            
            # Try to get core models
            try:
                from core.models import Owner, Tenant, Property
                print("✅ Core models imported successfully")
                
                # Check if models are registered with admin
                if Owner in admin.site._registry:
                    print("✅ Owner model registered with admin")
                else:
                    print("❌ Owner model not registered with admin")
                    
            except Exception as e:
                print(f"❌ Error importing core models: {e}")
        else:
            print("❌ Core app not installed")
        
        return True
        
    except Exception as e:
        print(f"❌ Error checking admin configuration: {str(e)}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("Debug Admin Login")
    print("=" * 60)
    
    debug_admin_login()
    check_admin_configuration()
    
    print("\n" + "=" * 60)
    print("Debug completed!")
    print("=" * 60)
