from .settings_common import *

SECRET_KEY = "qfz@bjg4e-+#cx%z4ffro0^j_x_i^vdu^++_2ro)d)%$rj*6qz"

DEBUG = False

ALLOWED_HOSTS = ["cradle.prodaft.com"]

CSRF_TRUSTED_ORIGINS = ["https://cradle.prodaft.com"]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": "cradle",
        "USER": "cradle",
        "PASSWORD": "yEApjBMQovSQUiv",
        "HOST": "localhost",
        "PORT": "5432",
    }
}

MINIO_CONFIG = {
    "endpoint": "cradle.prodaft.com:9000",
    "access_key": "admin",
    "secret_key": "RJ4Zy78GJuJ26Uz",
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
