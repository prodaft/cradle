"""Signal open clients that a notification was created. The list stays on the HTTP API."""

import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)


def group_name(user_id) -> str:
    """Channel-layer group for one user's notification sockets."""
    return f"notifications.{user_id}"


def broadcast_notification(user_id, message: str, notification_type: str, notification_id: str) -> None:
    """Tell the user's open clients to refetch, and carry the title key and text.

    Failures are logged. The notification row is already committed, so a channel-layer
    error must not turn the request into a failure.
    """
    layer = get_channel_layer()
    if layer is None:
        return
    try:
        async_to_sync(layer.group_send)(
            group_name(user_id),
            {
                "type": "notification.created",
                "id": str(notification_id),
                "message": message,
                "notification_type": notification_type,
            },
        )
    except Exception:
        logger.exception("Failed to signal a new notification for user %s", user_id)
