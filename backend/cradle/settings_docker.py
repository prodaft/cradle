import random

# Ugly hack to get graph_tool working
import sys

import sentry_sdk
from environs import Env

from .settings_common import *  # noqa:F401,F403

global_base = random.__file__.removesuffix("random.py")

global_packages = [global_base + "site-packages/", global_base + "dist-packages/"]

sys.path += global_packages

# Initialize environs
env = Env()
env.read_env()  # Read environment variables from a .env file if present

sentry_sdk.init(
    dsn=env.str("SENTRY_DSN", ""),
    traces_sample_rate=1.0,
)

SECRET_KEY = env.str("SECRET_KEY", "django-insecure-default-secret-key")

DEBUG = env.bool("DEBUG", False)

ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", ["localhost", "127.0.0.1"])

CSRF_TRUSTED_ORIGINS = env.list(
    "CSRF_TRUSTED_ORIGINS", ["http://localhost", "http://127.0.0.1"]
)

DATABASES = {
    "default": {
        "ENGINE": env.str("DB_ENGINE", "django.contrib.gis.db.backends.postgis"),
        "NAME": env.str("DB_NAME", "cradle"),
        "USER": env.str("DB_USER", "postgres"),
        "PASSWORD": env.str("DB_PASSWORD", "postgres"),
        "HOST": env.str("DB_HOST", "localhost"),
        "PORT": env.str("DB_PORT", "5432"),
    }
}

MINIO_CONFIG = {
    "endpoint": env.str("MINIO_ENDPOINT", "localhost"),
    "access_key": env.str("MINIO_ROOT_USER", "admin"),
    "secret_key": env.str("MINIO_ROOT_PASSWORD", "admin"),
    "secure": env.bool("MINIO_SECURE", True),
}

MINIO_BACKEND_URL = env.str("MINIO_BACKEND_URL", MINIO_BACKEND_URL)  # noqa: F405

# django-storages S3 configuration (for MinIO compatibility)
# Note: Each model can use its own storage class with a specific bucket
# See file_transfer/storage.py for available storage classes
STORAGES = {
    "default": {
        "BACKEND": "storages.backends.s3.S3Storage",
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}

AWS_ACCESS_KEY_ID = env.str("MINIO_ROOT_USER", "admin")
AWS_SECRET_ACCESS_KEY = env.str("MINIO_ROOT_PASSWORD", "admin")
AWS_S3_ENDPOINT_URL = env.str(
    "AWS_S3_ENDPOINT_URL",
    f"{'https' if env.bool('MINIO_SECURE', True) else 'http'}://{env.str('MINIO_ENDPOINT', 'localhost')}",
)
AWS_S3_USE_SSL = env.bool("MINIO_SECURE", True)
AWS_S3_VERIFY = env.bool("AWS_S3_VERIFY", True)
AWS_S3_SIGNATURE_VERSION = "s3v4"
AWS_S3_ADDRESSING_STYLE = "path"

BASE_URL = env.str("BASE_URL", "")
STATIC_URL = env.str("STATIC_URL", "static/")
FRONTEND_URL = env.str("FRONTEND_URL", "http://localhost:5173")

RABBITMQ_URL = env.str("RABBITMQ_URL", None)
REDIS_URL = env.str("REDIS_URL", None)
BROKER = RABBITMQ_URL if RABBITMQ_URL else REDIS_URL
RESULT_BACKEND = REDIS_URL

EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"

if env.bool("NOCHECK_EMAIL_SSL", False):
    EMAIL_BACKEND = "mail.backend.EmailBackend"

EMAIL_HOST = env.str("EMAIL_HOST", None)
EMAIL_PORT = env.int("EMAIL_PORT", -1)
EMAIL_HOST_USER = env.str("EMAIL_HOST_USER", None)
DEFAULT_FROM_EMAIL = env.str("DEFAULT_FROM_EMAIL", None)
EMAIL_HOST_PASSWORD = env.str("EMAIL_HOST_PASSWORD", None)
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", False)

USE_SILK = env.bool("USE_SILK", False)

if USE_SILK:
    MIDDLEWARE = ["silk.middleware.SilkyMiddleware"] + MIDDLEWARE  # noqa: F405
    INSTALLED_APPS.append("silk")  # noqa: F405
    # Disable EXPLAIN analysis which can break parameterized JSON updates
    SILKY_ANALYZE_QUERIES = False
