import inspect
import logging

from django.db import transaction
from drf_spectacular.utils import (
    OpenApiExample,
    OpenApiParameter,
    OpenApiResponse,
    extend_schema,
)
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from core.exceptions import CoreErrorCodes, NotFoundException
from core.openapi import get_common_error_responses, get_error_responses
from entries.models import Entry
from entries.tasks import (
    delete_hanging_artifacts,
    refresh_edges_materialized_view,
    update_accesses,
)
from file_transfer.tasks import reprocess_all_files_task
from user.authentication import CookieJWTAuthentication
from user.permissions import HasAdminRole

from .models import BaseSettingsSection, Setting
from .serializers import ManagementActionResponseSerializer
from .settings import cradle_settings

logger = logging.getLogger(__name__)


def _settings_sections() -> list[BaseSettingsSection]:
    """Return every settings section registered on ``cradle_settings``."""
    return [
        section
        for name in dir(cradle_settings)
        if not name.startswith("_") and isinstance(section := getattr(cradle_settings, name), BaseSettingsSection)
    ]


def _validate_setting(value, default) -> str | None:
    """Return an error message if ``value`` does not have the type of the setting's ``default``."""
    if isinstance(default, bool):
        return None if isinstance(value, bool) else "Must be true or false."
    if isinstance(default, int):
        if not isinstance(value, int) or isinstance(value, bool):
            return "Must be a whole number."
        return None if value >= 0 else "Must be zero or greater."
    if isinstance(default, str):
        return None if isinstance(value, str) else "Must be text."
    return None


class SettingsView(APIView):
    """Get or update namespaced settings (notes, users, files). Admin only."""

    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated, HasAdminRole]

    @extend_schema(
        operation_id="management_settings_retrieve",
        summary="Get all settings with defaults",
        description="Returns all known settings in a nested JSON format, including defaults for any missing values.",
        responses={
            200: OpenApiResponse(
                response=dict,
                description="Nested settings dictionary with defaults applied.",
            ),
            **get_common_error_responses(),
        },
    )
    def get(self, request: Request, *args, **kwargs) -> Response:
        result = {}

        for section in _settings_sections():
            result[section.prefix] = {}

            for name, _ in inspect.getmembers(type(section), lambda m: isinstance(m, property)):
                try:
                    value = getattr(section, name)
                    result[section.prefix][name] = value
                except AttributeError, TypeError, ValueError:
                    logger.warning(
                        "Could not read setting %s.%s",
                        section.prefix,
                        name,
                        exc_info=True,
                    )
                    result[section.prefix][name] = "This value could not be loaded."

        return Response(result, status=status.HTTP_200_OK)

    @extend_schema(
        operation_id="management_settings_update",
        summary="Update one or more settings",
        description=(
            "Accepts a nested JSON object to create or update multiple settings at once. "
            "Each key becomes a namespaced setting key like `notes.min_entries`. Every key must be a known "
            "setting and every value must have that setting's type, or be null to reset it to its default; "
            "otherwise nothing is saved and the response lists the invalid fields."
        ),
        request=dict,
        responses={
            200: OpenApiResponse(response=dict, description="Successfully updated all settings."),
            **get_error_responses(include_validation_error=True),
            **get_common_error_responses(),
        },
        examples=[
            OpenApiExample(
                name="Example PATCH",
                request_only=True,
                value={
                    "notes": {"min_entries": 2, "allow_dynamic_entry_class_creation": True},
                    "files": {"autoprocess_files": True},
                },
            )
        ],
    )
    def patch(self, request: Request, *args, **kwargs) -> Response:
        if not isinstance(request.data, dict):
            raise ValidationError({"non_field_errors": ["Send the settings as a JSON object."]})

        defaults = {
            f"{section.prefix}.{key}": default
            for section in _settings_sections()
            for key, default in section.defaults().items()
        }
        flat_settings = self._flatten_settings(request.data)

        errors = {}
        for full_key, value in flat_settings.items():
            if full_key not in defaults:
                errors[full_key] = ["This setting does not exist."]
            elif value is not None and (message := _validate_setting(value, defaults[full_key])):
                errors[full_key] = [message]
        if errors:
            raise ValidationError(errors)

        with transaction.atomic():
            for full_key, value in flat_settings.items():
                if value is None:
                    for setting in Setting.objects.filter(key=full_key):
                        setting.delete()
                else:
                    Setting.objects.update_or_create(key=full_key, defaults={"value": value})

        return Response(
            {"updated": list(flat_settings), "current": self._nest_settings(flat_settings)},
            status=status.HTTP_200_OK,
        )

    def _flatten_settings(self, nested_dict, parent_key=""):
        """Convert nested dict to flat dotted keys (e.g. notes.min_entries -> value)."""
        items = {}
        for k, v in nested_dict.items():
            full_key = f"{parent_key}.{k}" if parent_key else k
            if isinstance(v, dict):
                items.update(self._flatten_settings(v, full_key))
            else:
                items[full_key] = v
        return items

    def _nest_settings(self, flat_dict):
        """Convert flat dotted keys back to nested dict."""
        nested = {}
        for key, value in flat_dict.items():
            parts = key.split(".")
            current = nested
            for part in parts[:-1]:
                current = current.setdefault(part, {})
            current[parts[-1]] = value
        return nested


class ActionView(APIView):
    """Execute admin management actions (refresh graph, reprocess files, etc.)."""

    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated, HasAdminRole]

    @classmethod
    def get_action_names(cls):
        """Return the URL names of the actions: method names without the action_ prefix, in kebab-case."""
        return [
            name[len("action_") :].replace("_", "-")
            for name in dir(cls)
            if name.startswith("action_") and callable(getattr(cls, name))
        ]

    def post(self, request: Request, action_name: str | None = None, *args, **kwargs) -> Response:
        """Dispatch to the action handler for the given kebab-case action_name."""
        if action_name not in self.get_action_names():
            raise NotFoundException(detail="That action could not be found.")
        return getattr(self, "action_" + action_name.replace("-", "_"))(request, *args, **kwargs)

    def action_refresh_materialized_graph(self, request, *args, **kwargs):
        """Refresh the materialized graph view (edges)."""
        refresh_edges_materialized_view.apply_async(force=True)
        return Response({"detail": "Started graph materialization."}, status=status.HTTP_202_ACCEPTED)

    def action_propagate_access_vectors(self, request, *args, **kwargs):
        """Propagate access vectors for all entities."""
        entities = Entry.entities.all()

        for entity in entities:
            update_accesses.apply_async(args=(entity.id,))

        return Response(
            {"detail": "Propagating the access vectors for all entities."},
            status=status.HTTP_202_ACCEPTED,
        )

    def action_reprocess_all_files(self, request, *args, **kwargs):
        """Re-run file processing for all uploaded files."""
        reprocess_all_files_task.apply_async()

        return Response({"detail": "Started reprocessing all files."}, status=status.HTTP_202_ACCEPTED)

    def action_delete_hanging_artifacts(self, request, *args, **kwargs):
        """Delete artifacts nothing points at (no relations, notes or aliasing entity)."""
        count = delete_hanging_artifacts()

        return Response({"detail": f"Deleted {count} artifacts."}, status=status.HTTP_200_OK)


ActionView = extend_schema(
    summary="Execute management actions",
    description="Executes various management actions for admin users. Available actions: "
    + ", ".join(ActionView.get_action_names()),
    parameters=[
        OpenApiParameter(
            name="action_name",
            type=str,
            location=OpenApiParameter.PATH,
            description="Name of the action to execute",
            enum=ActionView.get_action_names(),
        )
    ],
    request=None,
    responses={
        200: ManagementActionResponseSerializer,
        202: ManagementActionResponseSerializer,
        **get_error_responses(CoreErrorCodes.NOT_FOUND),
        **get_common_error_responses(),
    },
)(ActionView)
