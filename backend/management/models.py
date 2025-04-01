from django.db import models
from django.core.cache import cache
from django.conf import settings as django_settings


class Setting(models.Model):
    key = models.CharField(max_length=255, unique=True)
    value = models.JSONField()

    def __str__(self):
        return f"{self.key}: {self.value}"


class BaseSettingsSection:
    prefix = ""

    def __init__(self):
        self._cache = {}

    def get(self, key, default=None):
        full_key = f"{self.prefix}.{key}"
        if full_key not in self._cache:
            setting = cache.get_or_set(
                f"setting:{full_key}",
                lambda: Setting.objects.filter(key=full_key)
                .values_list("value", flat=True)
                .first(),
                timeout=300,
            )
            self._cache[full_key] = setting if setting is not None else default
        return self._cache[full_key]


class NotesSettings(BaseSettingsSection):
    prefix = "notes"

    @property
    def max_note_wordcount(self):
        return self.get("max_note_wordcount", 500)
