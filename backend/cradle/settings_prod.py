from .settings_common import *
from environs import Env
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration

env = Env()
env.read_env()  # Read environment variables from a .env file if present


DEBUG = False


sentry_sdk.init(
    dsn=env.str("SENTRY_DSN", ""),
    # Set traces_sample_rate to 1.0 to capture 100%
    # of transactions for tracing.
    traces_sample_rate=1.0,
)


ALLOWED_HOSTS = ["cradle.prodaft.com"]

CSRF_TRUSTED_ORIGINS = ["https://cradle.prodaft.com"]

SECRET_KEY = env.str("SECRET_KEY", "django-insecure-default-secret-key")
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
    "endpoint": env.str("MINIO_ENDPOINT", "cradle.prodaft.com:9000"),
    "access_key": env.str("MINIO_ROOT_USER", "admin"),
    "secret_key": env.str("MINIO_ROOT_PASSWORD", ""),
    "secure": True,
}

SMTP_USERNAME = ""
SMTP_PASSWORD = ""
SMTP_HOST = ""
SMTP_PORT = ""

ALLOW_REGISTRATION = False
AUTOREGISTER_ARTIFACT_TYPES = False
MIN_ENTRY_COUNT_PER_NOTE = 2
MIN_ENTITY_COUNT_PER_NOTE = 1

REQUIRE_EMAIL_CONFIRMATION = True
ADMIN_ACTIVATION = True

BASE_URL = "api"
STATIC_URL = "static/"
FRONTEND_URL = "https://cradle.prodaft.com"

EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = "mail.prodaft.com"
EMAIL_PORT = 587
EMAIL_HOST_USER = "cradle@prodaft.com"
DEFAULT_FROM_EMAIL = "cradle@prodaft.com"
EMAIL_HOST_PASSWORD = None
EMAIL_USE_TLS = True
REQUIRE_ADMIN_ACTIVATION = False
