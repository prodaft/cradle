#!/bin/sh

: "${NUM_WORKERS:=12}"

echo "Running migrations..."
uv run python manage.py migrate

if [ "$AUTO_POPULATE" = "false" ]; then
    echo "Skipping population..."
else    
    echo "Seeding entries..."
    uv run python manage.py seed_entries

    echo "Initializing admin account..."
    uv run python manage.py initadmin
fi

echo "Deleting hanging entries..."
uv run python manage.py delete_hanging_entries

# Start the application
exec uv run gunicorn --workers $NUM_WORKERS -b 0.0.0.0:8000 cradle.wsgi:application