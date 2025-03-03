#!/bin/sh

NUM_WORKERS=12

pipenv run python manage.py collectstatic --noinput -c
chown -R www-data:www-data static

pipenv run python manage.py migrate

if $INSTALL_FIXTURES; then
  pipenv run python manage.py loaddata entries
fi

pipenv run python manage.py initadmin
pipenv run python manage.py delete_hanging_entries

pipenv run gunicorn --workers $NUM_WORKERS -b 0.0.0.0:8000 cradle.wsgi:application
