"""Tell a login session's open WebSockets that the session has ended."""

import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)


def session_group(session_id) -> str:
    """Channel-layer group of the WebSockets opened with one login session."""
    return f"session.{session_id}"


def signal_session_ended(session_id) -> None:
    """Close the session's sockets. Failures are logged: the session is already gone either way."""
    layer = get_channel_layer()
    if layer is None:
        return
    try:
        async_to_sync(layer.group_send)(session_group(session_id), {"type": "session.ended"})
    except Exception:
        logger.exception("Failed to signal the end of session %s", session_id)
