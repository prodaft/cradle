#!/bin/sh

: "${CELERY_QUEUES:=email,notes,graph,publish,import,access,enrich,digest,files,cleanup}"
: "${LOGLEVEL:=info}"
: "${CELERY_CONCURRENCY:=4}"

echo "Running Celery Beat migrations..."
python manage.py migrate django_celery_beat

echo "Starting Celery worker (Queues: $CELERY_QUEUES, Concurrency: $CELERY_CONCURRENCY)..."
exec celery -A cradle worker --beat -Q "$CELERY_QUEUES" --loglevel="$LOGLEVEL" --concurrency="$CELERY_CONCURRENCY"