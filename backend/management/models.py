from django.conf import settings
from django.core.cache import cache
from django.db import models
from django_lifecycle import AFTER_DELETE, AFTER_SAVE, LifecycleModelMixin, hook


class Setting(models.Model, LifecycleModelMixin):
    """Stored key-value setting, namespaced via dotted keys (e.g. notes.min_entries)."""

    key = models.CharField(
        max_length=255,
        unique=True,
        help_text="Namespaced setting key (e.g. notes.min_entries).",
    )
    value = models.JSONField(help_text="Setting value (JSON-serializable).")

    def __str__(self):
        return f"{self.key}: {self.value}"

    @hook(AFTER_SAVE)
    @hook(AFTER_DELETE)
    def invalidate_cache(self):
        """Clear cached value on save/delete."""
        cache.delete(f"setting:{self.key}")


class BaseSettingsSection:
    """Base for settings sections; reads from DB/cache with fallback to defaults."""

    prefix = ""

    def get(self, key, default=None):
        """Get setting value from cache/DB, falling back to default."""
        full_key = f"{self.prefix}.{key}"
        value = cache.get_or_set(
            f"setting:{full_key}",
            lambda: Setting.objects.filter(key=full_key).values_list("value", flat=True).first(),
            timeout=300,
        )

        default = settings.DEFAULT_SETTINGS.get(self.prefix, {}).get(key, default)

        if value is None:
            cache.set(f"setting:{full_key}", default, timeout=300)
            return default

        return value
