"""Shared base for container enrichers.

Each container enricher imports this module, implements ``enrich(job: dict) -> dict``,
and calls ``main(enrich_fn)`` as its entry point.

The container:
- Loads the job JSON from ``/job.json`` when the worker bind-mounts it; otherwise
  reads stdin (for local testing).
- Calls ``enrich_fn(job)`` and writes the result JSON to stdout.
- Uses exit code 0 when the result envelope is written (including parse failures
  and :func:`_fatal`); tracebacks from ``enrich_fn`` go to stderr and become
  structured errors in the JSON.

No database or Django inside the image.
"""

import json
import os
import sys
import traceback
from typing import Callable

_JOB_FILE = "/job.json"


def main(enrich_fn: Callable[[dict], dict]) -> None:
    """Entry point for all container enrichers.

    Args:
        enrich_fn: A callable that accepts the parsed job dict and returns a
            result dict matching the ``EnricherResult`` schema::

                {
                    "relations": [...],
                    "warnings": [...],
                    "errors": [...]
                }
    """
    try:
        if os.path.isfile(_JOB_FILE):
            with open(_JOB_FILE, encoding="utf-8") as job_f:
                raw = job_f.read()
        else:
            raw = sys.stdin.read()
        job = json.loads(raw)
    except Exception as exc:
        _fatal(f"Failed to parse job payload: {exc}")

    try:
        result = enrich_fn(job)
    except Exception:
        tb = traceback.format_exc()
        print(tb, file=sys.stderr)
        # Return a structured error so the caller can record it
        result = {
            "relations": [],
            "warnings": [],
            "errors": ["Enricher process raised an unhandled exception. Check container logs."],
        }

    # Ensure required keys are present
    result.setdefault("relations", [])
    result.setdefault("warnings", [])
    result.setdefault("errors", [])

    sys.stdout.write(json.dumps(result))
    sys.stdout.flush()


def _fatal(msg: str) -> None:
    print(msg, file=sys.stderr)
    result = {"relations": [], "warnings": [], "errors": [msg]}
    sys.stdout.write(json.dumps(result))
    sys.stdout.flush()
    sys.exit(0)


def enrichment_entry(job: dict) -> dict:
    """Return the sentinel entry dict (name + entry_class) for this enrichment request."""
    return job["enrichment_entry"]


def make_relation(
    e1_name: str,
    e1_class: str,
    e2_name: str,
    e2_class: str,
    details: dict | None = None,
    inherit_av: bool = True,
) -> dict:
    """Build a relation dict for the result envelope."""
    return {
        "e1_name": e1_name,
        "e1_class": e1_class,
        "e2_name": e2_name,
        "e2_class": e2_class,
        "details": details or {},
        "inherit_av": inherit_av,
    }
