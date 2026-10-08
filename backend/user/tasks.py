"""Celery tasks for users: auth record cleanup."""

from celery import shared_task
from django.utils import timezone

from .models import BlacklistedToken


@shared_task
def delete_expired_blacklisted_tokens():
    """Delete blacklist entries for refresh tokens that have expired (they are rejected on expiry anyway)."""
    return BlacklistedToken.objects.filter(expires_at__lt=timezone.now()).delete()[0]
