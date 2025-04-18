from django.conf import settings
from django.db import models
from django.core.cache import cache


class Setting(models.Model):
    key = models.CharField(max_length=255, unique=True)
    value = models.JSONField()

    def __str__(self):
        return f"{self.key}: {self.value}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        cache.delete(f"setting:{self.key}")


class BaseSettingsSection:
    prefix = ""

    def get(self, key, default=None):
        full_key = f"{self.prefix}.{key}"
        from .models import Setting

        value = cache.get_or_set(
            f"setting:{full_key}",
            lambda: Setting.objects.filter(key=full_key)
            .values_list("value", flat=True)
            .first(),
            timeout=300,
        )

        default = settings.DEFAULT_SETTINGS.get(self.prefix, {}).get(key, default)

        if value is None:
            cache.set(f"setting:{full_key}", default, timeout=300)
            return default

        return value
