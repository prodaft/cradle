from celery import chain
from django.contrib.contenttypes.models import ContentType
from django_lifecycle.mixins import transaction
from rest_framework import status
from django.core.cache import cache
from rest_framework.response import Response
from rest_framework.views import APIView

from entries.models import Relation
from notes.models import Note
from notes.processor.entry_population_task import EntryPopulationTask
from notes.processor.smart_linker_task import SmartLinkerTask
from .models import BaseSettingsSection
from user.permissions import HasAdminRole
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiExample, OpenApiResponse

from rest_framework.permissions import IsAdminUser
from .settings import cradle_settings
from .models import Setting
from entries.tasks import (
    refresh_edges_materialized_view,
    simulate_graph,
    update_accesses,
)
from entries.models import Entry
import inspect


class SettingsView(APIView):
    permission_classes = [IsAdminUser]

    @extend_schema(
        summary="Get all settings with defaults",
        description="Returns all known settings in a nested JSON format, including defaults for any missing values.",
        responses={
            200: OpenApiResponse(
                response=dict,
                description="Nested settings dictionary with defaults applied.",
            )
        },
    )
    def get(self, request, *args, **kwargs):
        result = {}

        for section_name in dir(cradle_settings):
            if section_name.startswith("_"):
                continue

            section = getattr(cradle_settings, section_name)
            if not isinstance(section, BaseSettingsSection):
                continue

            result[section.prefix] = {}

            for name, member in inspect.getmembers(
                type(section), lambda m: isinstance(m, property)
            ):
                try:
                    value = getattr(section, name)
                    result[section.prefix][name] = value
                except Exception as e:
                    result[section.prefix][name] = f"<error: {str(e)}>"

        return Response(result)

    @extend_schema(
        summary="Update one or more settings",
        description=(
            "Accepts a nested JSON object to create or update multiple settings at once. "
            "Each key becomes a namespaced setting key like `notes.max_note_wordcount`."
        ),
        request=dict,
        responses={
            200: OpenApiResponse(
                response=dict, description="Successfully updated all settings."
            ),
            207: OpenApiResponse(
                response=dict, description="Some settings updated, others failed."
            ),
        },
        examples=[
            OpenApiExample(
                name="Example POST",
                request_only=True,
                value={
                    "notes": {"max_note_wordcount": 2000, "allow_file_uploads": True},
                    "ui": {"theme": "dark"},
                },
            )
        ],
    )
    def post(self, request, *args, **kwargs):
        updated = []
        errors = []

        flat_settings = self._flatten_settings(request.data)

        with transaction.atomic():
            for full_key, value in flat_settings.items():
                try:
                    Setting.objects.update_or_create(
                        key=full_key, defaults={"value": value}
                    )
                    cache.set(f"setting:{full_key}", value, timeout=300)
                    updated.append(full_key)
                except Exception as e:
                    errors.append({full_key: str(e)})

        response_data = self._nest_settings(flat_settings)
        status_code = status.HTTP_200_OK if not errors else status.HTTP_207_MULTI_STATUS

        return Response(
            {"updated": updated, "errors": errors, "current": response_data},
            status=status_code,
        )

    def _flatten_settings(self, nested_dict, parent_key=""):
        items = {}
        for k, v in nested_dict.items():
            full_key = f"{parent_key}.{k}" if parent_key else k
            if isinstance(v, dict):
                items.update(self._flatten_settings(v, full_key))
            else:
                items[full_key] = v
        return items

    def _nest_settings(self, flat_dict):
        nested = {}
        for key, value in flat_dict.items():
            parts = key.split(".")
            current = nested
            for part in parts[:-1]:
                current = current.setdefault(part, {})
            current[parts[-1]] = value
        return nested


class ActionView(APIView):
    permission_classes = [IsAuthenticated, HasAdminRole]

    def post(self, request, action_name=None, *args, **kwargs):
        handler = getattr(self, "action_" + action_name, None)
        if handler and callable(handler):
            return handler(request, *args, **kwargs)
        return Response(
            {"error": f"Unknown action: {action_name}"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    def action_relinkNotes(self, request, *args, **kwargs):
        Relation.objects.filter(
            content_type=ContentType.objects.get_for_model(Note)
        ).delete()

        for i in Note.objects.all():
            creation_task, _ = EntryPopulationTask(request.user).run(i, [])
            linker_task, _ = SmartLinkerTask(request.user).run(i, [])
            chain(creation_task, linker_task).apply_async()

        return Response({"message": "Started relinking notes."})

    def action_refreshMaterializedGraph(self, request, *args, **kwargs):
        refresh_edges_materialized_view.apply_async(force=True)
        return Response({"message": "Started graph materialization."})

    def action_recalculateNodePositions(self, request, *args, **kwargs):
        simulate_graph.apply_async()
        return Response({"message": "Started simulating graph."})

    def action_propagateAccessVectors(self, request, *args, **kwargs):
        entities = Entry.entities.all()

        for entity in entities:
            update_accesses.apply_async(args=(entity.id,))

        return Response({"message": "Propagating the access vectors for all entities"})
