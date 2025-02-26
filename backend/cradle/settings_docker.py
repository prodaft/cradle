from environs import Env
from .settings_common import *
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration

# Initialize environs
env = Env()
env.read_env()  # Read environment variables from a .env file if present

sentry_sdk.init(
    dsn=env.str("SENTRY_DSN", ""),
    traces_sample_rate=1.0,
)

SECRET_KEY = env.str("SECRET_KEY", "django-insecure-default-secret-key")

DEBUG = env.bool("DEBUG", True)

ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", ["localhost", "127.0.0.1"])

CSRF_TRUSTED_ORIGINS = env.list(
    "CSRF_TRUSTED_ORIGINS", ["http://localhost", "http://127.0.0.1"]
)

DATABASES = {
    "default": {
        "ENGINE": env.str("DB_ENGINE", "django.db.backends.postgresql"),
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

MINIO_BACKEND_URL = env.str("MINIO_BACKEND_URL", MINIO_BACKEND_URL)

ALLOW_REGISTRATION = env.bool("ALLOW_REGISTRATION", True)
AUTOREGISTER_ARTIFACT_TYPES = env.bool("AUTOREGISTER_ARTIFACT_TYPES", False)
MIN_ENTRY_COUNT_PER_NOTE = env.int("MIN_ENTRY_COUNT_PER_NOTE", 2)
MIN_ENTITY_COUNT_PER_NOTE = env.int("MIN_ENTITY_COUNT_PER_NOTE", 1)

BASE_URL = env.str("BASE_URL", "")
STATIC_URL = env.str("STATIC_URL", "static/")
FRONTEND_URL = env.str("FRONTEND_URL", "http://localhost:5173")

CELERY_BROKER_URL = env.str("CELERY_BROKER_URL", None)
CELERY_RESULT_BACKEND = env.str("CELERY_BROKER_BACKEND", None)
REDIS_URL = env.str("REDIS_URL", None)

REQUIRE_EMAIL_CONFIRMATION = env.bool("REQUIRE_EMAIL_CONFIRMATION", False)
REQUIRE_ADMIN_ACTIVATION = env.bool("REQUIRE_ADMIN_ACTIVATION", False)


EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"

if env.bool("CUSTOM_EMAIL_SSL", False):
    EMAIL_BACKEND = "mail.backend.EmailBackend"

EMAIL_HOST = env.str("EMAIL_HOST", None)
EMAIL_PORT = env.int("EMAIL_PORT", -1)
EMAIL_HOST_USER = env.str("EMAIL_HOST_USER", None)
DEFAULT_FROM_EMAIL = env.str("DEFAULT_FROM_EMAIL", None)
EMAIL_HOST_PASSWORD = env.str("EMAIL_HOST_PASSWORD", None)
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", False)

EMAIL_SSL_CERTFILE = env.bool("EMAIL_SSL_CERTFILE", None)
EMAIL_SSL_KEYFILE = env.bool("EMAIL_SSL_KEYFILE", False)
CA_PATH = env.bool("CA_PATH", False)
