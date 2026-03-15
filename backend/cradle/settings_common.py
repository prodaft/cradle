"""Shared Django settings for Cradle. Installed apps, middleware, REST/OpenAPI config."""

import django_stubs_ext

django_stubs_ext.monkeypatch()

import tomllib
import os  # noqa: E402
from datetime import timedelta  # noqa: E402
from pathlib import Path  # noqa: E402

from corsheaders.defaults import default_headers

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

with open(BASE_DIR / "pyproject.toml", "rb") as f:
    VERSION = tomllib.load(f).get("project", {}).get("version", "0.0.0")

MEDIA_ROOT = os.path.join(BASE_DIR, "../media")

# CORS: restrict to allowed origins (set CORS_ALLOWED_ORIGINS in env or settings_docker)
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = []
CORS_ALLOW_HEADERS = list(default_headers) + ["Api-Key"]

# Default frontend/CSRF origins (override in settings_docker/settings_test)
DEFAULT_FRONTEND_URL = "http://localhost:5173"
DEFAULT_CSRF_ORIGINS = [
    DEFAULT_FRONTEND_URL,
    "http://localhost",
    "http://127.0.0.1",
    "http://127.0.0.1:5173",
]

# S3/MinIO signature (shared by docker and test settings)
AWS_S3_SIGNATURE_VERSION = "s3v4"


# Application definition
INSTALLED_APPS = [
    "corsheaders",
    "storages",
    "knowledge_graph.apps.KnowledgeGraphConfig",
    "intelio.apps.IntelIOConfig",
    "management.apps.ManagementConfig",
    "lsp.apps.LspConfig",
    "cradle_statistics.apps.CradleStatisticsConfig",
    "notifications.apps.NotificationsConfig",
    "logs.apps.LogsConfig",
    "file_transfer.apps.FileTransferConfig",
    "query.apps.QueryConfig",
    "access.apps.AccessConfig",
    "entries.apps.EntriesConfig",
    "user.apps.UserConfig",
    "notes.apps.NotesConfig",
    "mail.apps.MailConfig",
    "core.apps.CoreConfig",
    "publish.apps.PublishConfig",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django_celery_beat",
    "rest_framework",
    "rest_framework_simplejwt",
    "django_extensions",
    "drf_spectacular",
    "django_filters",
    "django.contrib.gis",
    "django_otp",
    "django_otp.plugins.otp_totp",
]

MIDDLEWARE = [
    "django.middleware.gzip.GZipMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "django_otp.middleware.OTPMiddleware",
]


def get_log_directory():
    """Get the log directory for the application.

    Returns /var/log/cradle/ if /var/log/ exists and is writable; else BASE_DIR.

    Returns:
        str: The log directory for the application.
    """
    log_dir = "/var/log/"
    cradle_log_dir = "/var/log/cradle/"

    if os.path.exists(log_dir) and os.access(log_dir, os.W_OK):
        if not os.path.exists(cradle_log_dir):
            try:
                os.mkdir(cradle_log_dir)
            except OSError:
                return str(BASE_DIR)
        return cradle_log_dir

    return str(BASE_DIR)


log_directory = get_log_directory()

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {process:d} {thread:d} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "error_file": {
            "level": "ERROR",
            "class": "logging.FileHandler",
            "filename": os.path.join(log_directory, "exceptions.log"),
            "formatter": "verbose",
        },
        "console": {
            "class": "logging.StreamHandler",
        },
    },
    "loggers": {
        "django.request": {
            "handlers": ["error_file", "console"],
            "level": "ERROR",
            "propagate": False,
        },
    },
}

REST_FRAMEWORK = {
    "DEFAULT_PAGINATION_CLASS": "core.pagination.TotalPagesPagination",
    "PAGE_SIZE": 10,
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "user.authentication.APIKeyAuthentication",
        "user.authentication.CookieJWTAuthentication",
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_SCHEMA_CLASS": "core.openapi.CradleAutoSchema",
    "DEFAULT_PARSER_CLASSES": ("rest_framework.parsers.JSONParser",),
    "EXCEPTION_HANDLER": "core.exception_handler.custom_exception_handler",
    "DEFAULT_THROTTLE_RATES": {
        "auth": "10/minute",
    },
}

SPECTACULAR_SETTINGS = {
    "TITLE": "CRADLE",
    "DESCRIPTION": "Threat Intelligence Knowledge Management",
    "VERSION": VERSION,
    "SERVE_INCLUDE_SCHEMA": False,
    "SCHEMA_PATH_PREFIX": r"/api",
    "SCHEMA_PATH_PREFIX_TRIM": True,
    "SERVERS": [{"url": "/api", "description": "API"}],
    "COMPONENT_SPLIT_REQUEST": True,
    "COMPONENT_NO_READ_ONLY_REQUIRED": True,
    "POSTPROCESSING_HOOKS": [
        "cradle.schema_processors.postprocess_schema_enums",
        "cradle.schema_processors.postprocess_schema_operation_ids",
        "cradle.schema_processors.postprocess_schema_pagination_refs",
    ],
    # Error handling - RFC 9457 compliant
    "ENUM_NAME_OVERRIDES": {
        "ErrorCodeEnum": "core.exceptions.ErrorCode",
    },
}

SIMPLE_JWT = {
    "TOKEN_OBTAIN_SERIALIZER": "user.serializers.TokenObtainSerializer",
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=14),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
}

# JWT HttpOnly cookie settings
JWT_ACCESS_COOKIE_NAME = "access_token"
JWT_REFRESH_COOKIE_NAME = "refresh_token"
JWT_COOKIE_SECURE = True
JWT_COOKIE_SAMESITE = "Lax"
JWT_COOKIE_DOMAIN = None
JWT_COOKIE_PATH = "/"

# OAuth provider settings used by backend OAuth flows.
OAUTH_PROVIDERS = {}
# Allowed redirect_uri origins for OAuth (scheme + netloc). Override in settings_docker.
OAUTH_REDIRECT_URI_WHITELIST = []


def build_oauth_methods(oauth_providers: dict) -> list[dict]:
    """Build OAuth method metadata for the auth/config endpoint from provider config."""
    methods = []
    for provider, config in oauth_providers.items():
        if not isinstance(config, dict):
            continue
        method = {
            "id": provider,
            "label": config.get("label") or provider,
        }
        if config.get("authorization_url"):
            method["authorization_url"] = config["authorization_url"]
        methods.append(method)
    return methods


# OAuth provider metadata exposed by the auth/config endpoint.
OAUTH_METHODS = build_oauth_methods(OAUTH_PROVIDERS)

# Cache for rate limiting (throttling). Uses local memory by default.
# Override with Redis in production for multi-worker deployments.
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}

ROOT_URLCONF = "cradle.urls"

CSRF_COOKIE_NAME = "csrf_token"
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SAMESITE = "None"
SESSION_COOKIE_SAMESITE = "None"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "cradle.wsgi.application"

# Password validation
# https://docs.djangoproject.com/en/5.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

AUTH_USER_MODEL = "user.CradleUser"

# Internationalization
# https://docs.djangoproject.com/en/5.0/topics/i18n/

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# Default primary key field type
# https://docs.djangoproject.com/en/5.0/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

STATIC_ROOT = os.path.join(BASE_DIR, "static")
STATICFILES_DIRS = []

# Can be set in specific config files if needed
MINIO_BACKEND_URL = None

# Application-specific config
ADMIN_PATH = "29acee84-15db-481b-b602-2c1a579178d0/"

CATALYST_HOST = "https://prod.blindspot.prodaft.com"
CATALYST_PUBLISH_CATEGORY = "RESEARCH"
CATALYST_PUBLISH_SUBCATEGORY = "4dff0ddf-fc2f-4a8e-b43f-1bc25973537b"

# File upload max size limit
FILE_UPLOAD_MAX_MEMORY_SIZE = 200 * 1024 * 1024

# Default settings dict
DEFAULT_SETTINGS = {}

# Internal subtypes (excluded from user-managed entry classes)
from entries.constants import INTERNAL_SUBTYPES  # noqa: E402
