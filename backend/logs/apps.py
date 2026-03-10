"""Logs app configuration."""

from django.apps import AppConfig


class LogsConfig(AppConfig):
    """App config for event logging (user actions on content objects)."""

    name = "logs"
