# Enrichment Developer Guide

Enrichers look up external data for artifacts (hashes, IPs, domains, ...) and link the results back into the
graph. Every enricher runs in its own short-lived Docker container; the backend never runs enrichment code
in-process. This guide covers how the pieces fit together and how to add a new enricher. The container
contract, image build and network policy are documented in [`../enrichers/README.md`](../enrichers/README.md).

## How an enrichment runs

1. A user requests enrichment of an artifact. An `EnrichmentRequest` (`intelio/models/base.py`) is created with
   the selected `EnricherSettings`, and `intelio.tasks.core.start_enrich` queues one `run_enricher` task per
   enricher. Each task enriches only the request's entries whose class is in that enricher's `for_eclasses`.
2. `run_enricher` calls `intelio.runner.docker_runner.run_enricher_container`, which:
   - builds the job JSON (`enricher_type`, the `EnricherSettings.settings` dict, the entries, the sentinel
     enrichment entry, and any type mappings the enricher needs, read from the database in the worker by
     `_build_extra_payload`);
   - starts `<ENRICHER_DOCKER_IMAGE_PREFIX>/<slug>` with the job bind-mounted read-only at `/job.json`, no
     capabilities, a read-only root filesystem, memory/CPU limits and `ENRICHER_TIMEOUT`, on the network chosen
     by `_default_network_for` (or `settings["network"]`);
   - parses stdout as an `EnricherResult` (`intelio/runner/serializers.py`) and, in `_apply_result`, creates the
     returned entries and relations with the request's access vector and records warnings/errors on the request.
3. Per-enricher status (`EnrichmentStatus`) and messages are stored on the `EnrichmentRequest`; failures are
   recorded there instead of being raised.

## Adding an enricher

1. **Backend config class** - add `intelio/models/enrichments/<name>.py` with a `BaseEnricher` subclass and import
   it in `intelio/models/__init__.py`. The class holds only metadata used for admin validation and the UI:

   ```python
   from django.db import models

   from ..base import BaseEnricher


   class ExampleEnricher(BaseEnricher):
       """Runs in enrichers/example/."""

       display_name = "Example"
       settings_fields = {
           "api_key": models.CharField(max_length=255, help_text="Example API key"),
           "timeout": models.IntegerField(default=30, help_text="Request timeout in seconds"),
       }
   ```

   The class name is the `enricher_type` stored on `EnricherSettings` and sent to the container.

2. **Container** - add `enrichers/<name>/` with `enricher.py`, `pyproject.toml` and a `Dockerfile` (copy an
   existing one). `enricher.py` implements `enrich(job: dict) -> dict` and calls `main(enrich)` from
   `_base/enricher_base.py`, which loads the job, writes the result JSON to stdout and turns uncaught exceptions
   into structured errors. Use `make_relation` and `enrichment_entry` from the same module to build relations.
   Report recoverable problems in `warnings` and fatal ones in `errors`; both are shown to the user.

3. **Runner wiring** in `intelio/runner/docker_runner.py`:
   - add the class name to `_ENRICHERS_NEEDING_EXTERNAL_NETWORK` if it calls external services
     (otherwise it runs with no network);
   - add a branch to `_build_extra_payload` if the container needs a type mapping from the database;
   - add an entry to `_DOCKER_IMAGE_SLUG_OVERRIDES` only if the image tag is not `<classname lowercased>`.

4. **Build** - add the directory name to `ALL_ENRICHERS` in `enrichers/build.sh` and build the image
   (`./build.sh <name>`). The worker pulls the image on first use if it is not present locally.

5. **Test** - the container can be exercised on its own by piping a job JSON (see the README) to
   `python enricher.py`.
