import random

# Ugly hack to get graph_tool working
import sys

from .settings_common import *  # noqa:F401,F403

global_base = random.__file__.removesuffix("random.py")

global_packages = [global_base + "site-packages/", global_base + "dist-packages/"]

sys.path += global_packages

SECRET_KEY = "django-insecure-0in+njnc5mjf3xuh$yjy+$s@78-!9rh$qjzv@aqw+*c$zh&d*&"

DEBUG = True

ALLOWED_HOSTS = ["localhost", "127.0.0.1"]

CSRF_TRUSTED_ORIGINS = ["http://localhost", "http://127.0.0.1", "http://localhost:5173"]

JWT_COOKIE_SECURE = True
JWT_COOKIE_SAMESITE = "Lax"

DATABASES = {
    "default": {
        "ENGINE": "django.contrib.gis.db.backends.postgis",
        "NAME": "cradle",
        "USER": "cradle",
        "PASSWORD": "cradle",
        "HOST": "192.168.31.40",
        "PORT": "5432",
    }
}

MINIO_CONFIG = {
    "endpoint": "192.168.31.41:9000",
    "access_key": "admin",
    "secret_key": "minio_admin",
    "secure": False,
}

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

AWS_ACCESS_KEY_ID = "admin"
AWS_SECRET_ACCESS_KEY = "minio_admin"
AWS_S3_ENDPOINT_URL = "http://192.168.31.41:9000"
AWS_S3_USE_SSL = False
AWS_S3_VERIFY = False
AWS_S3_SIGNATURE_VERSION = "s3v4"
AWS_S3_ADDRESSING_STYLE = "path"

RABBITMQ_URL = "amqp://cradle:cradle@192.168.31.44:5672//"
REDIS_URL = "redis://192.168.31.42:6379/0"
BROKER = RABBITMQ_URL
RESULT_BACKEND = REDIS_URL

BASE_URL = ""
STATIC_URL = "static/"
FRONTEND_URL = "http://localhost:5173"

EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = "mail.prodaft.com"
EMAIL_PORT = 587
EMAIL_HOST_USER = "cradle@prodaft.com"
DEFAULT_FROM_EMAIL = "cradle@prodaft.com"
EMAIL_HOST_PASSWORD = None
EMAIL_USE_TLS = True

USE_SILK = True
MIDDLEWARE = ["silk.middleware.SilkyMiddleware"] + MIDDLEWARE  # noqa: F405
INSTALLED_APPS.append("silk")  # noqa: F405

# Silk: disable query analysis (EXPLAIN) to avoid param mangling on JSON fields
SILKY_ANALYZE_QUERIES = False

DEFAULT_SETTINGS = {
    "users": {
        "allow_registration": True,
        "require_admin_confirmation": False,
        "require_email_confirmation": False,
    },
}

OAUTH_PROVIDERS = {
    "keycloak": {
        "issuer": "http://localhost:8081/realms/cradle",
        "label": "Keycloak",
        "authorization_url": "http://localhost:8081/realms/cradle/protocol/openid-connect/auth?client_id=cradle-ui&response_type=code&scope=openid%20email%20profile",
        "token_url": "http://localhost:8081/realms/cradle/protocol/openid-connect/token",
        "userinfo_url": "http://localhost:8081/realms/cradle/protocol/openid-connect/userinfo",
        "client_id": "cradle-ui",
        "client_secret": "",
    }
}

OAUTH_METHODS = build_oauth_methods(OAUTH_PROVIDERS)
