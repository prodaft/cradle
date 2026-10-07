# Docker Configuration & Environment Variables

This document describes the environment variables used by the CRADLE
application when running in Docker. These variables control critical settings
for the application’s behavior, database connectivity, email configuration, and
more.

---

## Table of Contents

- [Environment Variables](#environment-variables)
  - [Application Settings](#application-settings)
  - [Database Configuration](#database-configuration)
  - [MinIO Configuration](#minio-configuration)
  - [Additional Settings](#additional-settings)
  - [Email Configuration](#email-configuration)

---

## Environment Variables

### Application Settings

| Variable      | Type    | Default Value                                  | Description                                        |
|---------------|---------|------------------------------------------------|----------------------------------------------------|
| `SENTRY_DSN`  | String  | `""` (empty string)                            | DSN for Sentry error tracking.                     |
| `SECRET_KEY`  | String  | `"django-insecure-default-secret-key"`         | Django secret key. **Change for production!**      |
| `DEBUG`       | Boolean | `False`                                        | Enable or disable Django debug mode.               |
| `ALLOWED_HOSTS`| List   | `["localhost", "127.0.0.1"]`                     | List of hosts allowed to access the application.   |
| `CSRF_TRUSTED_ORIGINS` | List | `FRONTEND_URL`, `"http://localhost"`, `"http://127.0.0.1"` | Trusted origins for CSRF protection.               |

### Database Configuration

| Variable   | Type   | Default Value                           | Description                            |
|------------|--------|-----------------------------------------|----------------------------------------|
| `DB_ENGINE`| String | `"django.contrib.gis.db.backends.postgis"` | Django database engine to use.         |
| `DB_NAME`  | String | `"cradle"`                              | Name of the database.                  |
| `DB_USER`  | String | `"postgres"`                            | Database user name.                    |
| `DB_PASSWORD` | String | `"postgres"`                        | Database password.                     |
| `DB_HOST`  | String | `"localhost"`                           | Database host address.                 |
| `DB_PORT`  | String | `"5432"`                                | Database port.                         |

### MinIO Configuration

| Variable             | Type    | Default Value      | Description                                         |
|----------------------|---------|--------------------|-----------------------------------------------------|
| `MINIO_ENDPOINT`     | String  | `"localhost:9000"` | MinIO server endpoint.                              |
| `MINIO_ROOT_USER`    | String  | `"admin"`          | Access key for MinIO.                               |
| `MINIO_ROOT_PASSWORD`| String  | `"cradle_minio"`   | Secret key for MinIO.                               |
| `MINIO_SECURE`       | Boolean | `False`            | Use HTTPS when connecting to MinIO.               |
| `MINIO_BACKEND_URL`  | String  | *(See settings)*   | URL to access the MinIO backend (inherited from settings). |

### Additional Settings

| Variable                     | Type    | Default Value | Description                                                           |
|------------------------------|---------|---------------|-----------------------------------------------------------------------|
| `BASE_URL`                   | String  | `""` (empty)  | Base URL of the application (if applicable).                          |
| `STATIC_URL`                 | String  | `"static/"`   | URL path for serving static files.                                    |
| `FRONTEND_URL`               | String  | `"http://localhost:5173"` | URL for the frontend application.                             |

### Task Queue & Caching

| Variable              | Type   | Default Value | Description                                 |
|-----------------------|--------|---------------|---------------------------------------------|
| `RABBITMQ_URL`           | String | `None`        | URL for RabbitMQ (for Celery tasks).         |
| `REDIS_URL`           | String | `None`        | URL for Redis (Celery result backend and Channels layer). |

> If RABBITMQ_URL is not set, REDIS_URL is used as fallback

### Email Configuration

| Variable                     | Type    | Default Value | Description                                           |
|------------------------------|---------|---------------|-------------------------------------------------------|
| `NOCHECK_EMAIL_SSL`          | Boolean | `False`       | Disables SSL checks for email; alters the email backend.|
| `EMAIL_HOST`                 | String  | `None`        | SMTP server host for sending emails.                  |
| `EMAIL_PORT`                 | Integer | `-1`          | SMTP server port.                                     |
| `EMAIL_HOST_USER`            | String  | `None`        | SMTP server username.                                 |
| `DEFAULT_FROM_EMAIL`         | String  | `None`        | Default sender email address.                         |
| `EMAIL_HOST_PASSWORD`        | String  | `None`        | SMTP server password.                                 |
| `EMAIL_USE_TLS`              | Boolean | `False`       | Use TLS for SMTP connection.                          |


### Worker & Celery Settings

| Variable              | Type    | Default Value                                  | Description                                                           |
|-----------------------|---------|------------------------------------------------|-----------------------------------------------------------------------|
| `CELERY_QUEUES`       | String  | `"email,notes,graph,publish,import,access,enrich,digest,files,cleanup"` | Comma-separated list of Celery task queues (see `cradle/celery.py` `task_routes`). |
| `CELERY_CONCURRENCY`  | Integer | `4`                                            | Number of concurrent Celery worker threads per process.               |
| `NUM_WORKERS`         | Integer | `12`                                           | Number of Gunicorn worker processes.                                  |
