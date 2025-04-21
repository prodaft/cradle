#!/bin/sh

: "${CELERY_QUEUES:=email,notes,graph,publish,import,access,enrich,digest}"
: "${LOGLEVEL:=info}"
: "${CELERY_CONCURRENCY:=4}"

pipenv run python manage.py migrate django_celery_beat
pipenv run python manage.py migrate

pipenv run celery -A cradle worker --beat -Q "$CELERY_QUEUES" --loglevel="$LOGLEVEL" --concurrency="$CELERY_CONCURRENCY"
