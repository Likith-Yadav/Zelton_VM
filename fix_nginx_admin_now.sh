#!/bin/bash
# Fix nginx admin route - Run with: sudo bash /ZeltonLivings/appsdata/fix_nginx_admin_now.sh

set -e

CONFIG_FILE="/etc/nginx/nginx.conf"
BACKUP_FILE="/etc/nginx/nginx.conf.backup.$(date +%Y%m%d_%H%M%S)"

echo "Backing up nginx config..."
cp "$CONFIG_FILE" "$BACKUP_FILE"
echo "✓ Backup: $BACKUP_FILE"

# Use Python to fix the config
python3 << 'PYEOF'
import re

config_file = "/etc/nginx/nginx.conf"

with open(config_file, 'r') as f:
    lines = f.readlines()

# Find api.zelton.in server block
in_api_server = False
insert_index = -1
found_admin = False

for i, line in enumerate(lines):
    if 'server_name api.zelton.in' in line:
        in_api_server = True
        # Check if admin location already exists after this
        remaining = ''.join(lines[i:])
        if 'location /admin/' in remaining:
            # Check if it's in this server block (before the next server block)
            next_server = remaining.find('server {', remaining.find('location /admin/'))
            if next_server == -1 or remaining.find('location /admin/') < remaining.find('server {', 1):
                found_admin = True
                break
    
    if in_api_server:
        # Check if this is the catch-all location / block
        if line.strip() == 'location / {' and 'api.zelton.in' in ''.join(lines[max(0,i-50):i]):
            # Make sure we haven't already inserted
            if not found_admin:
                insert_index = i
                break
        # Check if we're at the end of the server block
        elif line.strip() == '}' and i > 0:
            # Make sure we're still in the server block (not at end of http block)
            if insert_index == -1 and not found_admin:
                # Check if location / exists above
                context = ''.join(lines[max(0,i-30):i])
                if 'location / {' in context:
                    # Insert before the closing brace
                    insert_index = i
                    break

if found_admin:
    print("INFO: /admin/ location already exists")
    exit(0)

if insert_index == -1:
    print("ERROR: Could not find insertion point in api.zelton.in server block")
    exit(1)

# Admin location block to insert
admin_block = """        # Backend admin interface
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

# Insert the block
lines.insert(insert_index, admin_block)

# Write back
with open(config_file, 'w') as f:
    f.writelines(lines)

print("SUCCESS: Added /admin/ location block to api.zelton.in server")
PYEOF

if [ $? -eq 0 ]; then
    echo ""
    echo "Testing nginx configuration..."
    nginx -t
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✓ Configuration is valid"
        echo "Reloading nginx..."
        systemctl reload nginx
        echo ""
        echo "✓✓✓ SUCCESS! Admin panel should now work at: https://api.zelton.in/admin/"
    else
        echo ""
        echo "✗ Configuration test failed! Restoring backup..."
        cp "$BACKUP_FILE" "$CONFIG_FILE"
        nginx -t
        exit 1
    fi
else
    echo "✗ Failed to update config"
    exit 1
fi

