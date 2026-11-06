"""Teams app: groups of users led by managers that share access to entities."""

from django.apps import AppConfig


class TeamsConfig(AppConfig):
    """Django app config for the teams module."""

    name = "teams"
    verbose_name = "Teams"
