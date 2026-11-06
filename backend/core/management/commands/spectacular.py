from drf_spectacular.management.commands.spectacular import Command as SpectacularCommand


class Command(SpectacularCommand):
    """drf-spectacular's ``spectacular`` command, defaulting to JSON output."""

    def add_arguments(self, parser):
        super().add_arguments(parser)
        parser.set_defaults(format="openapi-json")
