import functools
import inspect

from rest_framework import serializers


class ManagementActionResponseSerializer(serializers.Serializer):
    """Serializer for management action response (RFC 9457-aligned)."""

    detail = serializers.CharField(help_text="Success message")

    class Meta:
        ref_name = "ManagementActionResponse"


def _setting_field(default, help_text: str, *, partial: bool) -> serializers.Field:
    """Schema field for one setting, typed after its default (the PATCH view validates the same way)."""
    kwargs = {"help_text": help_text}
    if partial:
        kwargs.update(required=False, allow_null=True)
    if isinstance(default, bool):
        return serializers.BooleanField(**kwargs)
    if isinstance(default, int):
        return serializers.IntegerField(min_value=0, **kwargs)
    return serializers.CharField(allow_blank=True, **kwargs)


@functools.cache
def _section_serializer_class(section_cls: type, partial: bool) -> type[serializers.Serializer]:
    """Serializer describing one settings section; partial variants allow omitted or null (reset) values."""
    docs = {
        name: (prop.__doc__ or "").strip() for name, prop in inspect.getmembers(section_cls, inspect.isdatadescriptor)
    }
    fields = {
        key: _setting_field(default, docs.get(key, ""), partial=partial)
        for key, default in section_cls.defaults().items()
    }
    name = f"{section_cls.prefix.capitalize()}SettingsSection{'Patch' if partial else ''}"
    meta = type("Meta", (), {"ref_name": name})
    return type(name, (serializers.Serializer,), {**fields, "Meta": meta, "__doc__": section_cls.__doc__})


@functools.cache
def _system_settings_serializer_class(partial: bool) -> type[serializers.Serializer]:
    """Serializer for the nested settings document: one object per section prefix."""
    from .settings import settings_sections

    fields = {
        section.prefix: _section_serializer_class(type(section), partial)(required=not partial)
        for section in settings_sections()
    }
    name = f"SystemSettings{'Patch' if partial else ''}"
    meta = type("Meta", (), {"ref_name": name})
    doc = (
        "Settings to change, by section; null resets a setting to its default."
        if partial
        else "All settings by section, with defaults applied."
    )
    return type(name, (serializers.Serializer,), {**fields, "Meta": meta, "__doc__": doc})


def system_settings_serializer(*, partial: bool) -> serializers.Serializer:
    """Schema-only serializer for GET (full) or PATCH (partial) settings bodies."""
    return _system_settings_serializer_class(partial)()


class SettingsUpdateResponseSerializer(serializers.Serializer):
    """Result of a settings update."""

    updated = serializers.ListField(
        child=serializers.CharField(),
        help_text="Dotted keys that were saved or reset, e.g. notes.min_entries.",
    )
    current = _system_settings_serializer_class(True)(help_text="The values just written, nested by section.")

    class Meta:
        ref_name = "SettingsUpdateResponse"
