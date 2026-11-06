"""Production/Docker settings for Cradle. Reads from env; Sentry, RabbitMQ/Redis, JWT tuning."""

import sentry_sdk
from environs import Env

from .settings_common import *  # noqa:F401,F403

# Initialize environs
env = Env()
env.read_env()  # Read environment variables from a .env file if present

sentry_sdk.init(
    dsn=env.str("SENTRY_DSN", ""),
    traces_sample_rate=1.0,
)

# Django core (secrets, hosts, URLs)
# Required in every environment: a fallback key would let anyone forge JWTs
SECRET_KEY = env.str("SECRET_KEY")
DEBUG = env.bool("DEBUG", False)

ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", ["localhost", "127.0.0.1"])

STATIC_URL = env.str("STATIC_URL", "static/")
FRONTEND_URL = env.str("FRONTEND_URL", DEFAULT_FRONTEND_URL)  # noqa: F405

_csrf_origins = list(
    dict.fromkeys(
        [FRONTEND_URL] + list(DEFAULT_CSRF_ORIGINS)  # noqa: F405
    )
)
CSRF_TRUSTED_ORIGINS = list(dict.fromkeys(env.list("CSRF_TRUSTED_ORIGINS", _csrf_origins) + [FRONTEND_URL]))

# Behind a TLS-terminating proxy: trust its X-Forwarded-Proto, so absolute URLs use https
if env.bool("TRUST_X_FORWARDED_PROTO", False):
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# Reverse proxies in front of the backend that append to X-Forwarded-For. The client address is taken
# that many hops from the end, so a client cannot spoof it (rate limits, session IPs); 0 trusts no header.
REST_FRAMEWORK["NUM_PROXIES"] = env.int("TRUSTED_PROXY_COUNT", 1)  # noqa: F405

ADMIN_PATH_UUID = env.str("ADMIN_PATH_UUID", ADMIN_PATH_UUID)  # noqa: F405

# Database
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

# Object storage (MinIO / S3)
MINIO_CONFIG = {
    "endpoint": env.str("MINIO_ENDPOINT", "localhost:9000"),
    "access_key": env.str("MINIO_ROOT_USER", "admin"),
    "secret_key": env.str("MINIO_ROOT_PASSWORD", "cradle_minio"),
    "secure": env.bool("MINIO_SECURE", False),
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

AWS_ACCESS_KEY_ID = MINIO_CONFIG["access_key"]
AWS_SECRET_ACCESS_KEY = MINIO_CONFIG["secret_key"]
AWS_S3_ENDPOINT_URL = env.str(
    "AWS_S3_ENDPOINT_URL",
    MINIO_BACKEND_URL
    if MINIO_BACKEND_URL
    else f"{'https' if MINIO_CONFIG['secure'] else 'http'}://{MINIO_CONFIG['endpoint']}",
)
AWS_S3_USE_SSL = MINIO_CONFIG["secure"]
AWS_S3_VERIFY = env.bool("AWS_S3_VERIFY", True)
AWS_S3_ADDRESSING_STYLE = "path"
# Where browsers reach object storage, for presigned URLs; server-side calls keep using
# AWS_S3_ENDPOINT_URL. Unset: presigned URLs use AWS_S3_ENDPOINT_URL too.
AWS_S3_PUBLIC_ENDPOINT_URL = env.str("AWS_S3_PUBLIC_ENDPOINT_URL", "") or None
AWS_S3_REGION_NAME = env.str("AWS_S3_REGION_NAME", "us-east-1")
AWS_S3_SIGNATURE_VERSION = env.str("AWS_S3_SIGNATURE_VERSION", "s3v4")
# Hosts (e.g. peer CRADLE instances on an internal network) whose report file URLs may
# resolve to private addresses. Everything else must be a public address.
DIGEST_TRUSTED_FILE_HOSTS = env.list("DIGEST_TRUSTED_FILE_HOSTS", [])

# CORS / OAuth (browser clients)
CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS",
    list(dict.fromkeys(o for o in _csrf_origins if o == FRONTEND_URL or ":5173" in o)),
)

# OAuth redirect_uri must match one of these origins (scheme + netloc)
OAUTH_REDIRECT_URI_WHITELIST = env.list(
    "OAUTH_REDIRECT_URI_WHITELIST",
    CORS_ALLOWED_ORIGINS,
)

# Celery (broker prefers RabbitMQ; result backend uses Redis)
RABBITMQ_URL = env.str("RABBITMQ_URL", None)
REDIS_URL = env.str("REDIS_URL", None)
BROKER = RABBITMQ_URL if RABBITMQ_URL else REDIS_URL
RESULT_BACKEND = REDIS_URL
CHANNEL_LAYERS = channel_layers(REDIS_URL)  # noqa: F405

# Email (SMTP)
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"

if env.bool("NOCHECK_EMAIL_SSL", False):
    EMAIL_BACKEND = "mail.backend.EmailBackend"

EMAIL_HOST = env.str("EMAIL_HOST", None)
EMAIL_PORT = env.int("EMAIL_PORT", -1)
EMAIL_HOST_USER = env.str("EMAIL_HOST_USER", None)
EMAIL_HOST_PASSWORD = env.str("EMAIL_HOST_PASSWORD", None)
DEFAULT_FROM_EMAIL = env.str("DEFAULT_FROM_EMAIL", None)
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", False)

# JWT (token lifetimes and auth cookies)
_access_lifetime_minutes = env.int("JWT_ACCESS_TOKEN_LIFETIME_MINUTES", 30)
_refresh_lifetime_days = env.int("JWT_REFRESH_TOKEN_LIFETIME_DAYS", 14)

SIMPLE_JWT = {
    **SIMPLE_JWT,  # noqa: F405
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=_access_lifetime_minutes),  # noqa: F405
    "REFRESH_TOKEN_LIFETIME": timedelta(days=_refresh_lifetime_days),  # noqa: F405
}

JWT_COOKIE_DOMAIN = env.str("JWT_COOKIE_DOMAIN", "") or None
JWT_COOKIE_PATH = env.str("JWT_COOKIE_PATH", "/")
JWT_COOKIE_SECURE = env.bool("JWT_COOKIE_SECURE", True)

# Intelio enricher containers
ENRICHER_DOCKER_IMAGE_PREFIX = env.str("ENRICHER_DOCKER_IMAGE_PREFIX", "cradle/enricher")
ENRICHER_MEM_LIMIT = env.str("ENRICHER_MEM_LIMIT", "256m")
ENRICHER_CPU_QUOTA = env.int("ENRICHER_CPU_QUOTA", 50000)
ENRICHER_TIMEOUT = env.int("ENRICHER_TIMEOUT", 120)
ENRICHER_EXTERNAL_NETWORK = env.str("ENRICHER_EXTERNAL_NETWORK", "enricher_external")

# Report branding (see REPORT_BRANDING in settings_common)
REPORT_BRANDING = {
    "organization": env.str("REPORT_BRANDING_ORGANIZATION", "CRADLE"),
    "tagline": env.str("REPORT_BRANDING_TAGLINE", ""),
    "contact": env.str("REPORT_BRANDING_CONTACT", ""),
    "logo": env.str("REPORT_BRANDING_LOGO", ""),
    "cover_image": env.str("REPORT_BRANDING_COVER_IMAGE", ""),
    "watermark": env.str("REPORT_BRANDING_WATERMARK", ""),
    "disclaimer": env.str("REPORT_BRANDING_DISCLAIMER", ""),
    "stylesheet": env.str("REPORT_BRANDING_STYLESHEET", ""),
    "page_margin": env.str("REPORT_BRANDING_PAGE_MARGIN", ""),
    "font_size": env.str("REPORT_BRANDING_FONT_SIZE", ""),
    "header_font_size": env.str("REPORT_BRANDING_HEADER_FONT_SIZE", ""),
    "paragraph_indent": env.str("REPORT_BRANDING_PARAGRAPH_INDENT", ""),
    "font_weight": env.str("REPORT_BRANDING_FONT_WEIGHT", ""),
    "bold_weight": env.str("REPORT_BRANDING_BOLD_WEIGHT", ""),
    "page_number_color": env.str("REPORT_BRANDING_PAGE_NUMBER_COLOR", ""),
    "toc_color": env.str("REPORT_BRANDING_TOC_COLOR", ""),
    "font_dir": env.str("REPORT_BRANDING_FONT_DIR", ""),
    "font_family": env.str("REPORT_BRANDING_FONT_FAMILY", ""),
}

# Silk request profiling (mutates MIDDLEWARE when enabled)
USE_SILK = env.bool("USE_SILK", False)

if USE_SILK:
    MIDDLEWARE = ["silk.middleware.SilkyMiddleware"] + MIDDLEWARE  # noqa: F405
    INSTALLED_APPS.append("silk")  # noqa: F405
    # Disable EXPLAIN analysis which can break parameterized JSON updates
    SILKY_ANALYZE_QUERIES = False
