#!/bin/sh

: "${NUM_WORKERS:=12}"

echo "Running migrations..."
python manage.py migrate

if [ "$AUTO_POPULATE" = "false" ]; then
    echo "Skipping population..."
else    
    echo "Seeding entries..."
    # python manage.py seed_entries

    echo "Initializing admin account..."
    python manage.py initadmin
fi

echo "Deleting hanging entries..."
python manage.py delete_hanging_entries

echo "Starting Gunicorn with $NUM_WORKERS workers..."
gunicorn --workers "$NUM_WORKERS" -b 0.0.0.0:8000 cradle.wsgi:application