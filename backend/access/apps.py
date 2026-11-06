"""Access control app: user permissions for entities (read, read-write, none)."""

from django.apps import AppConfig


class AccessConfig(AppConfig):
    """Django app config for the access module."""

    name = "access"
    verbose_name = "Access control"
