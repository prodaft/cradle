import inspect
import logging

from django.core.cache import cache
from django.db import IntegrityError, transaction
from drf_spectacular.utils import (
    OpenApiExample,
    OpenApiParameter,
    OpenApiResponse,
    extend_schema,
)
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from core.exceptions import BadRequestException, CoreErrorCodes
from core.openapi import get_common_error_responses, get_error_responses
from entries.models import Entry
from entries.tasks import (
    refresh_edges_materialized_view,
    update_accesses,
)
from file_transfer.tasks import reprocess_all_files_task
from user.permissions import HasAdminRole

from .models import BaseSettingsSection, Setting
from .serializers import ManagementActionResponseSerializer
from .settings import cradle_settings

logger = logging.getLogger(__name__)


class SettingsView(APIView):
    """Get or update namespaced settings (notes, users, files). Admin only."""

    authentication_classes = [JWTAuthentication]
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

        for section_name in dir(cradle_settings):
            if section_name.startswith("_"):
                continue

            section = getattr(cradle_settings, section_name)
            if not isinstance(section, BaseSettingsSection):
                continue

            result[section.prefix] = {}

            for name, _ in inspect.getmembers(type(section), lambda m: isinstance(m, property)):
                try:
                    value = getattr(section, name)
                    result[section.prefix][name] = value
                except (AttributeError, TypeError, ValueError):
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
            "Each key becomes a namespaced setting key like `notes.min_entries`."
        ),
        request=dict,
        responses={
            200: OpenApiResponse(response=dict, description="Successfully updated all settings."),
            207: OpenApiResponse(response=dict, description="Some settings updated, others failed."),
            **get_common_error_responses(),
        },
        examples=[
            OpenApiExample(
                name="Example POST",
                request_only=True,
                value={
                    "notes": {"min_entries": 2, "allow_dynamic_entry_class_creation": True},
                    "files": {"autoprocess_files": True},
                },
            )
        ],
    )
    def post(self, request: Request, *args, **kwargs) -> Response:
        updated = []
        errors = []

        flat_settings = self._flatten_settings(request.data or {})

        with transaction.atomic():
            for full_key, value in flat_settings.items():
                label = " › ".join(p.replace("_", " ").strip().title() for p in full_key.split(".") if p) or full_key
                try:
                    Setting.objects.update_or_create(key=full_key, defaults={"value": value})
                    cache.set(f"setting:{full_key}", value, timeout=300)
                    updated.append(full_key)
                except IntegrityError:
                    errors.append({label: "This value could not be saved; it may conflict with another setting."})
                except (ValueError, TypeError):
                    logger.warning("Could not save setting %s", full_key, exc_info=True)
                    errors.append({label: "This value could not be saved."})

        successful_updates = {k: flat_settings[k] for k in updated}
        response_data = self._nest_settings(successful_updates)
        status_code = status.HTTP_200_OK if not errors else status.HTTP_207_MULTI_STATUS

        return Response(
            {"updated": updated, "errors": errors, "current": response_data},
            status=status_code,
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

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, HasAdminRole]

    @classmethod
    def get_action_names(cls):
        """Return action names (method names without action_ prefix)."""
        return [
            name[len("action_") :] for name in dir(cls) if name.startswith("action_") and callable(getattr(cls, name))
        ]

    def post(self, request: Request, action_name: str | None = None, *args, **kwargs) -> Response:
        """Dispatch to the action handler for the given action_name."""
        handler = getattr(self, "action_" + action_name, None) if action_name else None
        if handler and callable(handler):
            return handler(request, *args, **kwargs)
        raise BadRequestException(detail="That operation is not supported.")

    def action_refresh_materialized_graph(self, request, *args, **kwargs):
        """Refresh the materialized graph view (edges)."""
        refresh_edges_materialized_view.apply_async(force=True)
        return Response({"detail": "Started graph materialization."}, status=status.HTTP_202_ACCEPTED)

    def action_recalculate_node_positions(self, request, *args, **kwargs):
        """No-op: positions are computed client-side on graph load. Kept for API/UI consistency."""
        return Response(
            {"detail": "Node positions will be recalculated on next graph load."}, status=status.HTTP_202_ACCEPTED
        )

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
        """Delete artifact entries that are not referenced by any note."""
        count, _ = Entry.artifacts.unreferenced().delete()

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
    request={
        "application/json": {
            "type": "object",
            "additionalProperties": True,
            "description": "Action-specific parameters",
            "example": {"any_param": "any_value"},
        }
    },
    responses={
        200: ManagementActionResponseSerializer,
        202: ManagementActionResponseSerializer,
        **get_error_responses(CoreErrorCodes.BAD_REQUEST),
        **get_common_error_responses(),
    },
)(ActionView)
