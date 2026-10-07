"""Publish app configuration."""

from django.apps import AppConfig


class PublishConfig(AppConfig):
    """Django app config for report publishing (download as HTML/plaintext/JSON)."""

    name = "publish"
