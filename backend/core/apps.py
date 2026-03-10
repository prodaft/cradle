"""Core app configuration."""

from django.apps import AppConfig


class CoreConfig(AppConfig):
    """Django app config for core (exceptions, pagination, validators, fields, OpenAPI, decorators)."""

    name = "core"
