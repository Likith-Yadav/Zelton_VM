#!/bin/bash
# Fix nginx config to add /admin/ location for api.zelton.in
# Run with: sudo bash /ZeltonLivings/appsdata/fix_nginx_admin.sh

set -e

CONFIG_FILE="/etc/nginx/nginx.conf"
BACKUP_FILE="/etc/nginx/nginx.conf.backup.$(date +%Y%m%d_%H%M%S)"

echo "Backing up nginx config..."
cp "$CONFIG_FILE" "$BACKUP_FILE"
echo "✓ Backed up to: $BACKUP_FILE"

echo "Adding /admin/ location block to api.zelton.in server..."

# Use python to do the insertion properly
python3 << 'PYTHON_SCRIPT'
import sys

config_file = "/etc/nginx/nginx.conf"

admin_location = """        # Backend admin interface
        location /admin/ {
            proxy_pass http://zelton_backend/admin/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Forwarded-Host $server_name;
            
            # Timeouts
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }
        
        # Backend static files
        location /static/ {
            alias /ZeltonLivings/appsdata/backend/zelton_backend/staticfiles/;
            expires 1y;
            add_header Cache-Control "public, immutable";
            access_log off;
        }

"""

try:
    with open(config_file, 'r') as f:
        lines = f.readlines()
    
    in_api_server = False
    insert_index = -1
    
    for i, line in enumerate(lines):
        if 'server_name api.zelton.in' in line:
            in_api_server = True
        elif in_api_server and line.strip() == 'location / {':
            insert_index = i
            break
        elif in_api_server and line.strip() == '}' and i > 0:
            # End of server block
            if insert_index == -1:
                # Check if we're at the end
                if 'server_name' not in lines[i-1]:
                    insert_index = i
                    break
    
    if insert_index == -1:
        print("ERROR: Could not find insertion point", file=sys.stderr)
        sys.exit(1)
    
    # Check if admin location already exists
    content = ''.join(lines)
    if 'location /admin/' in content and 'api.zelton.in' in content.split('location /admin/')[0].split('server_name api.zelton.in')[-1]:
        print("INFO: /admin/ location already exists in api.zelton.in server block")
        sys.exit(0)
    
    lines.insert(insert_index, admin_location)
    
    with open(config_file, 'w') as f:
        f.writelines(lines)
    
    print("SUCCESS: Added /admin/ location block")
    
except Exception as e:
    print(f"ERROR: {e}", file=sys.stderr)
    sys.exit(1)
PYTHON_SCRIPT

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Successfully updated nginx config"
    echo ""
    echo "Testing nginx configuration..."
    nginx -t
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✓ Nginx configuration is valid"
        echo ""
        echo "Reloading nginx..."
        systemctl reload nginx
        echo "✓ Nginx reloaded successfully"
        echo ""
        echo "Admin panel should now be accessible at: https://api.zelton.in/admin/"
    else
        echo ""
        echo "✗ Nginx configuration test failed!"
        echo "Restore backup with: sudo cp $BACKUP_FILE $CONFIG_FILE"
        exit 1
    fi
else
    echo "✗ Failed to update nginx config"
    exit 1
fi

