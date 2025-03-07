from .settings_common import *

SECRET_KEY = "django-insecure-0in+njnc5mjf3xuh$yjy+$s@78-!9rh$qjzv@aqw+*c$zh&d*&"

DEBUG = True

ALLOWED_HOSTS = ["localhost", "127.0.0.1"]

CSRF_TRUSTED_ORIGINS = ["http://localhost", "http://127.0.0.1"]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
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

ALLOW_REGISTRATION = True
AUTOREGISTER_ARTIFACT_TYPES = False
MIN_ENTRY_COUNT_PER_NOTE = 2
MIN_ENTITY_COUNT_PER_NOTE = 1

REQUIRE_EMAIL_CONFIRMATION = False
REQUIRE_ADMIN_ACTIVATION = False

CELERY_BROKER_URL = "redis://192.168.31.42:6379/0"
CELERY_RESULT_BACKEND = "redis://192.168.31.42:6379/0"
REDIS_URL = "redis://192.168.31.42:6379/0"

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
