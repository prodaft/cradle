"""Cradle Django project package. Exposes the Celery app for async task processing."""

from .celery import app

__all__ = ("app",)
