#!/bin/sh
set -e
: "${GATEWAY_URL:=http://127.0.0.1:42617}"
if [ -f /etc/nginx/conf.d/default.conf.template ]; then
  envsubst '$GATEWAY_URL' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf
fi
exec "$@"
