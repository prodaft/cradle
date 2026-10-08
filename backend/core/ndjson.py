"""NDJSON (newline-delimited JSON) over chunked HTTP."""

from __future__ import annotations

import json
from collections.abc import Iterator
from typing import Any

from django.http import StreamingHttpResponse


def ndjson_streaming_response(rows: Iterator[dict[str, Any]]) -> StreamingHttpResponse:
    """Stream one JSON object per line (UTF-8), chunked.

    Args:
        rows: Iterator of JSON-serializable dicts (typically serializer output).

    Returns:
        StreamingHttpResponse with ``application/x-ndjson`` body.
    """

    def chunks() -> Iterator[bytes]:
        for row in rows:
            yield (json.dumps(row, default=str) + "\n").encode("utf-8")

    response = StreamingHttpResponse(chunks(), content_type="application/x-ndjson")
    response["Cache-Control"] = "no-store"
    # Hint for nginx to flush chunks to the client instead of buffering the whole body.
    response["X-Accel-Buffering"] = "no"
    return response
