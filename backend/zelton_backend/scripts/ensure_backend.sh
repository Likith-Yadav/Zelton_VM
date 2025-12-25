#!/usr/bin/env bash
set -euo pipefail

service="zelton-backend"
sudo_cmd=""

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  sudo_cmd="sudo"
fi

if ! systemctl is-active --quiet "$service"; then
  $sudo_cmd systemctl restart "$service"
fi

$sudo_cmd systemctl status "$service" --no-pager
