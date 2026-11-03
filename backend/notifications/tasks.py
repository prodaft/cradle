"""Celery tasks for notifications."""

from celery import shared_task

from .models import MessageNotification


@shared_task
def notify_user_task(user_id, message):
    """Send ``message`` to the user as an in-app notification, e.g. when a background job they started ends."""
    MessageNotification.objects.create(user_id=user_id, message=message)
