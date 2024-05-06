from django.apps import AppConfig
from django.db.models.signals import post_migrate
from django.dispatch import receiver


def initialize_counter(sender, **kwargs):
    from .models import Counter

    if Counter.objects.exists():
        counter = Counter.objects.first()
        counter.value = 0
        counter.save()
    else:
        Counter.objects.create(value=0)


@receiver(post_migrate)
def on_post_migrate(sender, **kwargs):
    if sender.name == "counter":
        initialize_counter(sender, **kwargs)


class CounterConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "counter"
