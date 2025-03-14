
SECRET_KEY = "django-insecure-0in+njnc5mjf3xuh$yjy+$s@78-!9rh$qjzv@aqw+*c$zh&d*&"

DEBUG = True

ALLOWED_HOSTS = ["localhost", "127.0.0.1"]

CSRF_TRUSTED_ORIGINS = ["http://localhost", "http://127.0.0.1"]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": "cradledb",
        "USER": "postgres",
        "PASSWORD": "postgres",
        "HOST": "localhost",
        "PORT": "5432",
    }
}

MINIO_CONFIG = {
    "endpoint": "",
    "access_key": "",
    "secret_key": "",
    "secure": False,
}

ALLOW_REGISTRATION = True
AUTOREGISTER_ARTIFACT_TYPES = False
MIN_ENTRY_COUNT_PER_NOTE = 2
MIN_ENTITY_COUNT_PER_NOTE = 1

REQUIRE_EMAIL_CONFIRMATION = False
REQUIRE_ADMIN_ACTIVATION = False

BASE_URL = ""
STATIC_URL = "static/"
FRONTEND_URL = "http://localhost:5173"


RESULT_BACKEND = "redis://127.0.0.1:6379/0"
REDIS_URL = "redis://127.0.0.1:6379/0"

EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = ""
EMAIL_PORT = 587
EMAIL_HOST_USER = ""
DEFAULT_FROM_EMAIL = ""
EMAIL_HOST_PASSWORD = None
EMAIL_USE_TLS = True
