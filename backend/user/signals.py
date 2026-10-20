"""Signal handlers for the user app."""

from django.db import transaction
from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver

from .models import CradleUser, UserSession
from .realtime import signal_session_ended


@receiver(post_delete, sender=UserSession)
def close_sockets_of_ended_session(sender, instance: UserSession, **kwargs) -> None:
    """Every revocation (logout, revoke, password change, simulate, deactivation) deletes the session row."""
    session_id = instance.id
    transaction.on_commit(lambda: signal_session_ended(session_id))


@receiver(pre_save, sender=CradleUser)
def note_deactivation(sender, instance: CradleUser, **kwargs) -> None:
    """Remember whether this save turns an active account inactive (read by the post_save handler)."""
    instance._deactivated = (
        instance.pk is not None
        and not instance.is_active
        and CradleUser.objects.active().filter(pk=instance.pk).exists()
    )


@receiver(post_save, sender=CradleUser)
def end_sessions_of_deactivated_user(sender, instance: CradleUser, **kwargs) -> None:
    """A deactivated account keeps no sessions, so its tokens and open sockets stop at once."""
    if getattr(instance, "_deactivated", False):
        instance.revoke_sessions()
