"""Publish app configuration."""

from django.apps import AppConfig


class PublishConfig(AppConfig):
    """Django app config for report publishing (upload to Catalyst, download as HTML/plaintext/JSON)."""

    name = "publish"
