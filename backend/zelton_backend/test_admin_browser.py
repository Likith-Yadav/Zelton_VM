#!/usr/bin/env python
"""
Test admin with browser-like requests
"""

import requests
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

def test_admin_with_requests():
    """Test admin using requests library"""
    print("Testing admin with browser-like requests...")
    
    try:
        # Create session
        session = requests.Session()
        
        # Get admin login page
        print("1. Getting admin login page...")
        response = session.get('http://localhost:8000/admin/')
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            print("   ✅ Admin login page loads")
        else:
            print(f"   ❌ Admin login page failed: {response.status_code}")
            return False
        
        # Get CSRF token
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(response.text, 'html.parser')
        csrf_token = soup.find('input', {'name': 'csrfmiddlewaretoken'})
        
        if csrf_token:
            csrf_value = csrf_token['value']
            print(f"   ✅ CSRF token found: {csrf_value[:20]}...")
        else:
            print("   ❌ CSRF token not found")
            return False
        
        # Login
        print("2. Attempting login...")
        login_data = {
            'username': 'admin',
            'password': 'admin123',
            'csrfmiddlewaretoken': csrf_value,
            'next': '/admin/'
        }
        
        response = session.post('http://localhost:8000/admin/login/', data=login_data)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 302:
            print("   ✅ Login successful (redirect)")
            
            # Follow redirect
            print("3. Following redirect...")
            response = session.get('http://localhost:8000/admin/')
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                print("   ✅ Admin dashboard loads successfully")
                
                # Check if we can see the admin content
                if 'Django administration' in response.text:
                    print("   ✅ Django admin interface is visible")
                else:
                    print("   ❌ Django admin interface not visible")
                    print(f"   Response content preview: {response.text[:200]}")
                
                return True
            else:
                print(f"   ❌ Admin dashboard failed: {response.status_code}")
                print(f"   Response content: {response.text[:500]}")
                return False
        else:
            print(f"   ❌ Login failed: {response.status_code}")
            print(f"   Response content: {response.text[:500]}")
            return False
            
    except Exception as e:
        print(f"❌ Error during test: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("Test Admin with Browser-like Requests")
    print("=" * 60)
    
    # Check if requests and beautifulsoup are available
    try:
        import requests
        from bs4 import BeautifulSoup
    except ImportError:
        print("Installing required packages...")
        os.system("pip install requests beautifulsoup4")
        import requests
        from bs4 import BeautifulSoup
    
    success = test_admin_with_requests()
    
    print("\n" + "=" * 60)
    if success:
        print("✅ Admin test completed successfully!")
        print("The admin interface should work in your browser.")
    else:
        print("❌ Admin test failed!")
        print("There might be an issue with the admin configuration.")
    print("=" * 60)
