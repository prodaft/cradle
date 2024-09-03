#!/bin/sh

pipenv run python manage.py makemigrations
pipenv run python manage.py migrate
pipenv run python manage.py loaddata entries
pipenv run python manage.py initadmin
pipenv run gunicorn -b 0.0.0.0:8000 cradle.wsgi:application
