#!/bin/bash
# Add /admin/ location to api.zelton.in server block
# Run with: sudo bash /ZeltonLivings/appsdata/add_admin_to_api.sh

set -e

CONFIG_FILE="/etc/nginx/nginx.conf"
BACKUP_FILE="/etc/nginx/nginx.conf.backup.$(date +%Y%m%d_%H%M%S)"

echo "Backing up config..."
cp "$CONFIG_FILE" "$BACKUP_FILE"
echo "✓ Backup: $BACKUP_FILE"

# Admin block to insert
ADMIN_BLOCK="# Backend admin interface
        location /admin/ {
            proxy_pass http://zelton_backend/admin/;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            proxy_set_header X-Forwarded-Host \$server_name;
            
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }
        
        # Backend static files
        location /static/ {
            alias /ZeltonLivings/appsdata/backend/zelton_backend/staticfiles/;
            expires 1y;
            add_header Cache-Control \"public, immutable\";
            access_log off;
        }

        "

# Check if admin already exists in api.zelton.in block
if grep -A 50 "server_name api.zelton.in" "$CONFIG_FILE" | grep -q "location /admin/"; then
    echo "✓ /admin/ location already exists in api.zelton.in server block"
    exit 0
fi

# Use sed to insert before "location / {" in api.zelton.in server block
# First, create a temp file with the admin block
TEMP_ADMIN="/tmp/admin_block.txt"
cat > "$TEMP_ADMIN" << EOF
        $ADMIN_BLOCK
EOF

# Use awk to insert the block
python3 << 'PYEOF'
import sys

config_file = "/etc/nginx/nginx.conf"

admin_block = """        # Backend admin interface
        location /admin/ {
            proxy_pass http://zelton_backend/admin/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Forwarded-Host $server_name;
            
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

with open(config_file, 'r') as f:
    lines = f.readlines()

# Find api.zelton.in server block and location / within it
in_api_server = False
insert_index = -1

for i, line in enumerate(lines):
    if 'server_name api.zelton.in' in line:
        in_api_server = True
    elif in_api_server:
        # Find location / block
        if line.strip() == 'location / {':
            # Verify we're still in api.zelton.in server (check 20 lines back)
            context = ''.join(lines[max(0,i-20):i+1])
            if 'api.zelton.in' in context and 'location /admin/' not in context:
                insert_index = i
                break
        # If we hit closing brace and haven't found location /, something's wrong
        elif line.strip() == '}' and i > 20:
            # Check if we've seen location / but not admin
            context = ''.join(lines[max(0,i-30):i])
            if 'location / {' in context and 'location /admin/' not in context:
                # Find location / line
                for j in range(i-1, max(0,i-30), -1):
                    if lines[j].strip() == 'location / {':
                        insert_index = j
                        break
                break

if insert_index == -1:
    print("ERROR: Could not find location to insert admin block")
    print("Looking for 'location / {' after 'server_name api.zelton.in'")
    sys.exit(1)

# Insert the block
lines.insert(insert_index, admin_block)

# Write back
with open(config_file, 'w') as f:
    f.writelines(lines)

print(f"SUCCESS: Added /admin/ location at line {insert_index+1}")
PYEOF

if [ $? -eq 0 ]; then
    echo ""
    echo "Testing nginx config..."
    nginx -t
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✓ Config valid, reloading nginx..."
        systemctl reload nginx
        echo ""
        echo "✓✓✓ SUCCESS! Admin panel should work at: https://api.zelton.in/admin/"
    else
        echo ""
        echo "✗ Config test failed! Restoring backup..."
        cp "$BACKUP_FILE" "$CONFIG_FILE"
        exit 1
    fi
else
    echo "✗ Failed to update config"
    exit 1
fi

