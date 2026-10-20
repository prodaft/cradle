#!/bin/sh

: "${NUM_WORKERS:=12}"

echo "Running migrations..."
python manage.py migrate

echo "Collecting static files..."
python manage.py collectstatic --noinput

if [ "$AUTO_POPULATE" = "false" ]; then
    echo "Skipping population..."
else    
    echo "Seeding entries..."
    python manage.py seed_entries --populate-existing

    echo "Initializing admin account..."
    python manage.py initadmin
fi

echo "Deleting hanging entries..."
python manage.py delete_hanging_entries

echo "Starting Daphne for WebSockets on port 8001..."
daphne -b 0.0.0.0 -p 8001 cradle.asgi:application &

echo "Starting Gunicorn with $NUM_WORKERS workers..."
gunicorn --workers "$NUM_WORKERS" -b 0.0.0.0:8000 cradle.wsgi:application