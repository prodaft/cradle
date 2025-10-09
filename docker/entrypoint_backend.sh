#!/bin/sh

: "${NUM_WORKERS:=12}"

uv run python manage.py collectstatic --noinput -c
chown -R www-data:www-data static

uv run python manage.py migrate django_celery_beat
uv run python manage.py migrate

if $INSTALL_FIXTURES; then
  uv run python manage.py loaddata entries
fi

uv run python manage.py initadmin
uv run python manage.py delete_hanging_entries

uv run gunicorn --workers $NUM_WORKERS -b 0.0.0.0:8000 cradle.wsgi:application
