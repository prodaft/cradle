"""Test settings for Cradle. Relaxed throttling, Docker service hosts (postgres, minio, redis)."""

from .settings_common import *  # noqa:F401,F403

SECRET_KEY = "django-insecure-0in+njnc5mjf3xuh$yjy+$s@78-!9rh$qjzv@aqw+*c$zh&d*&"

# Disable auth rate limiting in tests (tests run many requests in quick succession)
REST_FRAMEWORK = {
    **REST_FRAMEWORK,  # noqa: F405
    "DEFAULT_THROTTLE_RATES": {"auth": "10000/minute"},
}

DEBUG = True

ALLOWED_HOSTS = ["localhost", "127.0.0.1"]

BASE_URL = ""
STATIC_URL = "static/"
FRONTEND_URL = "http://localhost:5173"

CSRF_TRUSTED_ORIGINS = [
    "http://localhost",
    "http://127.0.0.1",
    FRONTEND_URL,
    "http://127.0.0.1:5173",
]

DATABASES = {
    "default": {
        "ENGINE": "django.contrib.gis.db.backends.postgis",
        "NAME": "cradledb",
        "USER": "postgres",
        "PASSWORD": "postgres",
        "HOST": "postgres",
        "PORT": "5432",
    }
}

MINIO_CONFIG = {
    "endpoint": "minio:9000",
    "access_key": "admin",
    "secret_key": "minio_admin",
    "secure": False,
}

STORAGES = {
    "default": {"BACKEND": "storages.backends.s3.S3Storage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}
AWS_ACCESS_KEY_ID = "admin"
AWS_SECRET_ACCESS_KEY = "minio_admin"
AWS_S3_ENDPOINT_URL = "http://minio:9000"
AWS_S3_USE_SSL = False
AWS_S3_VERIFY = False
AWS_S3_SIGNATURE_VERSION = "s3v4"
AWS_S3_ADDRESSING_STYLE = "path"

CORS_ALLOWED_ORIGINS = [FRONTEND_URL, "http://127.0.0.1:5173"]
OAUTH_REDIRECT_URI_WHITELIST = CORS_ALLOWED_ORIGINS

REDIS_URL = "redis://redis:6379/0"
BROKER = REDIS_URL
RESULT_BACKEND = REDIS_URL

EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = ""
EMAIL_PORT = 587
EMAIL_HOST_USER = ""
DEFAULT_FROM_EMAIL = ""
EMAIL_HOST_PASSWORD = None
EMAIL_USE_TLS = True
USE_SILK = False

DEFAULT_SETTINGS = {
    "users": {
        "allow_registration": True,
        "require_admin_confirmation": False,
        "require_email_confirmation": False,
    },
}
