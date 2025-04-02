from .settings_common import *

# Ugly hack to get graph_tool working
import sys
import random

global_base = random.__file__.removesuffix("random.py")

global_packages = [global_base + "site-packages/", global_base + "dist-packages/"]

sys.path += global_packages


SECRET_KEY = "django-insecure-0in+njnc5mjf3xuh$yjy+$s@78-!9rh$qjzv@aqw+*c$zh&d*&"

DEBUG = True

ALLOWED_HOSTS = ["localhost", "127.0.0.1"]

CSRF_TRUSTED_ORIGINS = ["http://localhost", "http://127.0.0.1"]

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

RABBITMQ_URL = "amqp://cradle:cradle@192.168.31.44:5672//"
REDIS_URL = "redis://192.168.31.42:6379/0"
RESULT_BACKEND = RABBITMQ_URL

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
