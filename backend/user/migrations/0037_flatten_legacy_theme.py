"""Flatten themes still stored in the old ``{"mode": ..., "vars": {...}}`` shape.

The UI now expects a flat object of CSS variables plus a ``name`` (``"light"`` selects light mode).
"""

from copy import deepcopy

from django.db import migrations

from user.constants import USER_DEFAULT_THEME


def flatten_theme(theme: dict) -> dict:
    """Return the flat theme for one legacy ``{mode, vars}`` theme."""
    mode = theme.get("mode")
    legacy_vars = theme.get("vars")
    if not isinstance(legacy_vars, dict) or not legacy_vars:
        return {"name": "light"} if mode == "light" else deepcopy(USER_DEFAULT_THEME)

    flat = {key: value for key, value in legacy_vars.items() if isinstance(value, str)}
    flat["name"] = "light" if mode == "light" else theme.get("name") or "custom"
    return flat


def forwards(apps, schema_editor):
    """Rewrite every stored theme that still uses the legacy shape."""
    CradleUser = apps.get_model("user", "CradleUser")
    for user in CradleUser.objects.filter(theme__has_any_keys=["mode", "vars"]).only("id", "theme"):
        if isinstance(user.theme, dict):
            CradleUser.objects.filter(id=user.id).update(theme=flatten_theme(user.theme))


class Migration(migrations.Migration):
    dependencies = [
        ("user", "0036_api_key_sha256_digest"),
    ]

    operations = [
        migrations.RunPython(forwards, migrations.RunPython.noop),
    ]
