#!/bin/sh

rm -rf /www/cradle
cp -r /cradle /www/cradle
chown -R www:www /www

echo "STARTING NGINX"
nginx -g "daemon off;"
