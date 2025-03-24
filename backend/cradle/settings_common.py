import django_stubs_ext

django_stubs_ext.monkeypatch()

import os
from datetime import timedelta
from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

MEDIA_ROOT = os.path.join(BASE_DIR, "../media")

# CORS_ALLOW_HEADERS = ["*"]
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
CORS_ORIGIN_ALLOW_ALL = True


# Application definition
INSTALLED_APPS = [
    "corsheaders",
    "intelio.apps.IntelIOConfig",
    "lsp.apps.LspConfig",
    "cradle_statistics.apps.CradleStatisticsConfig",
    "notifications.apps.NotificationsConfig",
    "logs.apps.LogsConfig",
    "file_transfer.apps.FileTransferConfig",
    "query.apps.QueryConfig",
    "access.apps.AccessConfig",
    "entries.apps.EntriesConfig",
    "fleeting_notes.apps.FleetingNotesConfig",
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
    "rest_framework",
    "rest_framework_simplejwt",
    "django_extensions",
    "drf_spectacular",
    "django_filters",
]

MIDDLEWARE = [
    "django.middleware.gzip.GZipMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


def get_log_directory():
    """Get the log directory for the application.
    This is /var/log/cradle/ if /var/log/ exists and is writable,
    and cradle/ can be created in it. Otherwise, it is the BASE_DIR.

    Args:

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
        "simple": {
            "format": "{levelname} {message}",
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
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_PARSER_CLASSES": (
        "rest_framework.parsers.FormParser",
        "rest_framework.parsers.MultiPartParser",
        "rest_framework.parsers.JSONParser",
    ),
}

SPECTACULAR_SETTINGS = {
    "TITLE": "CRADLE",
    "DESCRIPTION": "Threat Intelligence Knowledge Management",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

SIMPLE_JWT = {
    "TOKEN_OBTAIN_SERIALIZER": "user.serializers.TokenObtainSerializer",
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "SLIDING_TOKEN_REFRESH_LIFETIME": timedelta(days=1),
    "SLIDING_TOKEN_LIFETIME": timedelta(days=30),
    "SLIDING_TOKEN_REFRESH_LIFETIME_LATE_USER": timedelta(days=1),
    "SLIDING_TOKEN_LIFETIME_LATE_USER": timedelta(days=30),
}

ROOT_URLCONF = "cradle.urls"

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
STATICFILES_DIRS = [os.path.join(BASE_DIR, "notes", "static")]

# Can be set in specific config files if needed
MINIO_BACKEND_URL = None

## Application Specific Config
ADMIN_PATH = "29acee84-15db-481b-b602-2c1a579178d0/"

CATALYST_HOST = "https://prod.blindspot.prodaft.com"
CATALYST_PUBLISH_CATEGORY = "RESEARCH"
CATALYST_PUBLISH_SUBCATEGORY = "4dff0ddf-fc2f-4a8e-b43f-1bc25973537b"
