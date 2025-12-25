#!/usr/bin/env bash
set -euo pipefail

services=("zelton-backend" "nginx" "redis" "redis-server")

for svc in "${services[@]}"; do
  if ! systemctl list-unit-files --type=service | grep -q "^${svc}\\.service"; then
    continue
  fi
  if ! systemctl is-active --quiet "$svc"; then
    sudo systemctl restart "$svc"
  fi
  sudo systemctl status "$svc" --no-pager
  echo "---"
done
