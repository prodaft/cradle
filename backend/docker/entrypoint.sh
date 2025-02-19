#!/bin/sh

pipenv run python manage.py collectstatic --noinput
mv static /var/www/static

cd frontend
export VITE_API_BASE_URL="$FRONTEND_URL/api"
npm run tailwind
npm run build
mv out/renderer /var/www/cradle
cd ..

chown -R www-data:www-data /var/www
service nginx start

pipenv run python manage.py migrate
# pipenv run python manage.py loaddata entries
pipenv run python manage.py initadmin
pipenv run python manage.py delete_hanging_entries

pipenv run gunicorn -b 0.0.0.0:8888 cradle.wsgi:application
