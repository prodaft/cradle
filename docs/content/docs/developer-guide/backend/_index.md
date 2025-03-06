+++
title = "Backend Development Guide"
date = "2025-03-05T12:55:52+01:00"
linkTitle = "Backend"
draft = false
+++

Welcome to the **Backend Development Guide** for CRADLE. This guide is tailored
for backend developers working on our Django-powered API. It provides insights
into the projectect structure and architecture of the CRADLE backend, and it
explains how to set up and run the application locally.

## Getting Started

Follow these steps to get the backend up and running:

1. **Clone the Repository**
   ```bash
   git clone https://github.com/prodaft/cradle.git
   cd cradle/backend
   git submodule update --init --recursive
   ```

2. **Database Setup**
   Create the PostgreSQL database:
   ```bash
   psql -U [your-postgres-username]
   CREATE DATABASE cradledb;
   ```

3. **Redis Setup**
   Ensure Redis is installed and running:
   ```bash
   # On Ubuntu:
   sudo apt install redis-server
   sudo systemctl start redis
   ```

4. **Configure Environment**
   Update your environment settings in `cradle/settings.py` to match your local setup. For example:
   ```python
   DATABASES = {
       'default': {
           'ENGINE': 'django.db.backends.postgresql',
           'NAME': 'cradledb',
           'USER': '[your_user]',
           'PASSWORD': '[your_password]',
           'HOST': 'localhost',
           'PORT': '5432',
       }
   }

   CELERY_BROKER_URL = 'redis://localhost:6379/0'
   ```

5. **Install Dependencies**
   Install dependencies using Pipenv:
   ```bash
   pip install pipenv
   pipenv install
   ```

6. **Run Migrations**
   Apply database migrations:
   ```bash
   pipenv run python manage.py migrate
   ```

7. **Start Services**
   Launch the Django development server:
   ```bash
   pipenv run python manage.py runserver
   ```
   In a separate terminal, start the Celery worker:
   ```bash
   pipenv run celery -A cradle worker -Q email,notes,publish,import -l INFO
   ```

## Common Commands

```bash
# Run tests
pipenv run python manage.py test

# Create new migration
pipenv run python manage.py makemigrations

# Generate API documentation
cd docs && make html

# Monitor Celery tasks with Flower
pipenv run celery -A cradle flower
```

## Troubleshooting

**Database Connection Issues**
- Ensure PostgreSQL is running.
- Verify the credentials in `settings.py` match your local configuration.

**Celery Task Issues**
- Confirm Redis is running.
- Ensure the Celery worker is started.
- Use Flower to monitor task queues.

## Topics Covered

This guide includes detailed sections on:

{{< cards >}}
  {{< card link="structure" title="App Structure" icon="view-grid" >}}
  {{< card link="logging" title="Logging" icon="newspaper" >}}
  {{< card link="testing" title="Testing" icon="terminal" >}}
{{< /cards >}}


{{< callout type="info" >}} We recommend you first read the [user guide]({{< ref "/docs/userguide" >}}) to understand how the application works {{< /callout >}}

Happy coding and thank you for contributing to the CRADLE backend!
