#!/bin/sh

rm -rf /www/cradle
cp -r /ui/dist /www/cradle
chown -R www:www /www

echo "STARTING NGINX"
nginx -g "daemon off;"
