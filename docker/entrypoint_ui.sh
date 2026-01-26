#!/bin/sh

rm -rf /www/cradle
cp -r /cradle /www/cradle
chown -R www:www /www

echo "STARTING NGINX"
exec nginx -g "daemon off;"
