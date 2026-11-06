"""Django app config for the mail module."""

from django.apps import AppConfig


class MailConfig(AppConfig):
    """App config for transactional email (password reset, confirmations, access requests, reports, enrichments)."""

    name = "mail"
