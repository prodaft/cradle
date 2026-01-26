#!/bin/sh

: "${CELERY_QUEUES:=email,notes,graph,publish,import,access,enrich,digest,files}"
: "${LOGLEVEL:=info}"
: "${CELERY_CONCURRENCY:=4}"

uv run python manage.py migrate django_celery_beat

exec uv run celery -A cradle worker --beat -Q "$CELERY_QUEUES" --loglevel="$LOGLEVEL" --concurrency="$CELERY_CONCURRENCY"
