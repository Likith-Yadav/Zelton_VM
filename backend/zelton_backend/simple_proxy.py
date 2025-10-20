#!/usr/bin/env python3
"""
Simple HTTP Reverse Proxy for Zelton Backend
This script creates a reverse proxy to serve your Django backend on port 80
"""

import http.server
import socketserver
import urllib.request
import urllib.parse
import urllib.error
import json
import ssl
from urllib.parse import urlparse

class ReverseProxyHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.proxy_request()
    
    def do_POST(self):
        self.proxy_request()
    
    def do_PUT(self):
        self.proxy_request()
    
    def do_DELETE(self):
        self.proxy_request()
    
    def proxy_request(self):
        # Parse the request
        parsed_path = urlparse(self.path)
        
        # Forward to Django backend
        backend_url = f"http://127.0.0.1:8000{self.path}"
        
        try:
            # Prepare headers
            headers = {}
            for header, value in self.headers.items():
                if header.lower() not in ['host', 'connection']:
                    headers[header] = value
            
            # Add X-Forwarded headers
            headers['X-Forwarded-For'] = self.client_address[0]
            headers['X-Forwarded-Proto'] = 'https'  # Assume HTTPS
            headers['X-Forwarded-Host'] = 'zelton.in'
            
            # Create request
            if self.command == 'GET':
                req = urllib.request.Request(backend_url, headers=headers)
            else:
                # Read request body
                content_length = int(self.headers.get('Content-Length', 0))
                post_data = self.rfile.read(content_length) if content_length > 0 else None
                req = urllib.request.Request(backend_url, data=post_data, headers=headers)
                req.get_method = lambda: self.command
            
            # Make request to backend
            with urllib.request.urlopen(req, timeout=30) as response:
                # Send response headers
                self.send_response(response.status)
                
                # Copy response headers
                for header, value in response.headers.items():
                    if header.lower() not in ['connection', 'transfer-encoding']:
                        self.send_header(header, value)
                
                self.end_headers()
                
                # Copy response body
                self.wfile.write(response.read())
                
        except urllib.error.HTTPError as e:
            self.send_error(e.code, e.reason)
        except Exception as e:
            self.send_error(500, f"Proxy error: {str(e)}")
    
    def log_message(self, format, *args):
        # Custom logging
        print(f"[{self.date_time_string()}] {format % args}")

def run_proxy(port=80):
    """Run the reverse proxy server"""
    print(f"🚀 Starting Zelton Backend Reverse Proxy on port {port}")
    print(f"📡 Proxying requests to Django backend at http://127.0.0.1:8000")
    print(f"🌐 Your backend will be accessible at: http://zelton.in")
    print("Press Ctrl+C to stop")
    
    try:
        with socketserver.TCPServer(("", port), ReverseProxyHandler) as httpd:
            httpd.serve_forever()
    except PermissionError:
        print(f"❌ Permission denied to bind to port {port}")
        print("💡 Try running with sudo or use a different port:")
        print(f"   sudo python3 {__file__}")
        print(f"   python3 {__file__} 8080")
    except KeyboardInterrupt:
        print("\n🛑 Proxy server stopped")

if __name__ == "__main__":
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 80
    run_proxy(port)








