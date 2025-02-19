#!/bin/sh


mkdir -p /www

cd /ui

export VITE_API_BASE_URL="$FRONTEND_URL/api"
npm run build

echo "BUILT SUCCESSFULLY"

rm -rf /www/cradle

mv out/renderer /www/cradle

chown -R www:www /www

echo "STARTING NGINX"
nginx -g "daemon off;"
