"""Docker-based enricher container launcher.

The Celery worker calls :func:`run_enricher_container` instead of invoking
``enricher.enrich()`` directly.  The function:

1. Serializes ORM data to a JSON job payload.
2. Writes the payload to a host temp file and mounts it read-only at ``/job.json``.
3. Starts a short-lived Docker container with ``--network none`` (or the
   ``enricher_external`` network for internet-capable enrichers).
4. Captures stdout and parses it as an :class:`~.serializers.EnricherResult`.
5. Applies the result to the database (creates ``Entry`` / ``Relation`` rows,
   appends warnings/errors to the ``EnrichmentRequest``).

The container image is ``<ENRICHER_DOCKER_IMAGE_PREFIX>/<slug>`` (see
:func:`_docker_image_slug`), e.g. ``cradle/enricher/virustotalenricher``.

No database credentials, Django source code, or internal network routes are
available inside the container.
"""

import json
import logging
import os
import tempfile

import requests.exceptions
from django.conf import settings

from entries.enums import EntryType, RelationReason
from entries.models import Entry, EntryClass, Relation

from ..models.base import EnrichmentRequest
from .network import NETWORK_EXTERNAL, NETWORK_NONE, ensure_enricher_network, resolve_network_mode
from .serializers import EnricherResult, deserialize_result, serialize_job

logger = logging.getLogger(__name__)


# Enrichers that need outbound internet access (all current ones do).
# Enrichers that are purely offline (e.g. local file analysis) would use "none".
_ENRICHERS_NEEDING_EXTERNAL_NETWORK = frozenset(
    {
        "DNSEnricher",
        "VirusTotalEnricher",
        "AbuseIPDBEnricher",
        "CIRCLPDNSEnricher",
        "MISPEnricher",
        "MWDBEnricher",
        "OpenCTIEnricher",
        "URLScanEnricher",
    }
)


def _default_network_for(enricher_type: str) -> str:
    """Return the default Docker network mode for a given enricher type."""
    if enricher_type in _ENRICHERS_NEEDING_EXTERNAL_NETWORK:
        return NETWORK_EXTERNAL
    return NETWORK_NONE


def _build_extra_payload(enricher_type: str) -> dict:
    """Build extra type-mapping payload to inject into the container job JSON.

    These mappings are read from the database here (in the worker) and passed
    as plain dicts so the container never needs a DB connection.
    """
    payload: dict = {}

    if enricher_type in ("DNSEnricher", "CIRCLPDNSEnricher"):
        from ..models.mappings.dns import DNSMapping

        payload["dns_typemapping"] = {
            record_type: ec.subtype for record_type, ec in DNSMapping.get_typemapping_rev().items() if ec is not None
        }

    elif enricher_type == "MISPEnricher":
        from ..models.mappings.misp import MISPMapping

        # Forward mapping: cradle_subtype -> [misp_attr_type, ...]
        misp_typemapping: dict[str, list[str]] = {}
        # Reverse mapping: misp_attr_type -> cradle_subtype
        misp_rev_typemapping: dict[str, str] = {}

        for mapping in MISPMapping.objects.select_related("internal_class").all():
            subtype = mapping.internal_class.subtype
            attr_type = mapping.attribute_type
            misp_typemapping.setdefault(subtype, []).append(attr_type)
            misp_rev_typemapping[attr_type] = subtype

        payload["misp_typemapping"] = misp_typemapping
        payload["misp_rev_typemapping"] = misp_rev_typemapping

    elif enricher_type == "MWDBEnricher":
        from ..models.mappings.mwdb import MWDBMapping

        payload["mwdb_typemapping"] = {
            mwdb_type: ec.subtype for mwdb_type, ec in MWDBMapping.get_typemapping_rev().items() if ec is not None
        }

    elif enricher_type == "OpenCTIEnricher":
        from ..models.mappings.opencti import OpenCTIMapping

        payload["opencti_rev_typemapping"] = {
            opencti_type: ec.subtype
            for opencti_type, ec in OpenCTIMapping.get_typemapping_rev().items()
            if ec is not None
        }

    elif enricher_type == "URLScanEnricher":
        from ..models.mappings.urlscan import URLScanMapping

        payload["urlscan_typemapping"] = {
            urlscan_type: ec.subtype
            for urlscan_type, ec in URLScanMapping.get_typemapping_rev().items()
            if ec is not None
        }

    return payload


# Must stay aligned with backend/enrichers/build.sh image tags.
_DOCKER_IMAGE_SLUG_OVERRIDES: dict[str, str] = {
    "DNSEnricher": "dnsenricher",
    "CIRCLPDNSEnricher": "circl_pdnsenricher",
}


def _docker_image_slug(enricher_type: str) -> str:
    """Return the image repository segment (``<prefix>/<slug>``) for this enricher."""
    return _DOCKER_IMAGE_SLUG_OVERRIDES.get(enricher_type, enricher_type.lower())


def _image_name(enricher_type: str) -> str:
    prefix = getattr(settings, "ENRICHER_DOCKER_IMAGE_PREFIX", "cradle/enricher")
    return f"{prefix}/{_docker_image_slug(enricher_type)}"


def _apply_result(
    result: EnricherResult,
    request: EnrichmentRequest,
    enricher_type: str,
    access_vector,
) -> None:
    """Write the container result into the database.

    Creates ``Entry`` rows (via ``get_or_create``) and bulk-creates ``Relation``
    rows.  Appends any warnings/errors to the ``EnrichmentRequest``.
    """
    # Cache entry-class lookups within this call
    ec_cache: dict[str, EntryClass] = {}

    def _get_ec(subtype: str) -> EntryClass:
        if subtype not in ec_cache:
            ec_cache[subtype] = EntryClass.objects.get(subtype=subtype, type=EntryType.ARTIFACT)
        return ec_cache[subtype]

    relations_to_create = []

    for rel_spec in result.relations:
        try:
            e1_ec = _get_ec(rel_spec.e1_class)
            e2_ec = _get_ec(rel_spec.e2_class)
            e1, _ = Entry.objects.get_or_create(name=rel_spec.e1_name, entry_class=e1_ec)
            e2, _ = Entry.objects.get_or_create(name=rel_spec.e2_name, entry_class=e2_ec)

            relations_to_create.append(
                Relation(
                    e1=e1,
                    e2=e2,
                    inherit_av=rel_spec.inherit_av,
                    content_object=request,
                    access_vector=access_vector,
                    reason=RelationReason.ENRICHMENT,
                    reason_context=enricher_type,
                    details=rel_spec.details,
                )
            )
        except EntryClass.DoesNotExist:
            logger.warning(
                "Container enricher %s returned unknown entry class in relation: %r",
                enricher_type,
                rel_spec.model_dump(),
            )

    if relations_to_create:
        before = len(relations_to_create)
        relations_to_create = [r for r in relations_to_create if Relation.includes_entity(r.e1, r.e2)]
        skipped = before - len(relations_to_create)
        if skipped:
            logger.warning(
                "Container enricher %s skipped %d artifact-artifact relations",
                enricher_type,
                skipped,
            )
        if relations_to_create:
            Relation.objects.bulk_create(relations_to_create)

    for warning in result.warnings:
        request._append_warning(warning, enricher_type)

    for error in result.errors:
        request._append_error(error, enricher_type)


def run_enricher_container(
    enricher_type: str,
    enricher_settings: dict,
    entries: list,
    request: EnrichmentRequest,
) -> EnricherResult:
    """Run an enricher inside an isolated Docker container and return its result.

    Args:
        enricher_type: Python class name, e.g. ``"VirusTotalEnricher"``.
        enricher_settings: The ``EnricherSettings.settings`` dict (API keys, etc.).
        entries: List of ORM ``Entry`` objects to enrich.
        request: The parent ``EnrichmentRequest`` (used for the sentinel entry and
            access vector; never passed into the container).

    Returns:
        An :class:`~.serializers.EnricherResult` with relations, warnings, errors.

    Raises:
        ``docker.errors.ImageNotFound``: If the image is not in the registry
            (including after an attempted pull).
        ``docker.errors.DockerException`` / ``docker.errors.APIError``: On other
            Docker API failures.
        ``pydantic.ValidationError`` / ``json.JSONDecodeError``: If stdout is
            non-empty but not valid ``EnricherResult`` JSON.
    """
    # Determine network mode: enrichers that call external APIs need outbound internet.
    # All current enrichers except a hypothetical offline one need external access.
    # Admins can override per-enricher via EnricherSettings.settings["network"].
    network_setting = enricher_settings.get("network", _default_network_for(enricher_type))
    external_network = getattr(settings, "ENRICHER_EXTERNAL_NETWORK", "enricher_external")

    if network_setting == NETWORK_EXTERNAL:
        ensure_enricher_network(external_network)

    network_mode = resolve_network_mode(network_setting, external_network)

    # Build the sentinel entry info (name + class subtype only — no DB inside container)
    sentinel = request.entry
    enrichment_entry_name = sentinel.name
    enrichment_entry_class = sentinel.entry_class.subtype

    # Build optional type mappings for enrichers that need them (no DB inside container)
    extra_payload = _build_extra_payload(enricher_type)

    job_json = serialize_job(
        enricher_type=enricher_type,
        settings=enricher_settings,
        entries=entries,
        enrichment_entry_name=enrichment_entry_name,
        enrichment_entry_class=enrichment_entry_class,
        dns_typemapping=extra_payload.get("dns_typemapping"),
    )

    # Inject additional mapping payloads directly into the JSON
    if extra_payload:
        job_dict = json.loads(job_json)
        job_dict.update(extra_payload)
        job_json = json.dumps(job_dict)

    image = _image_name(enricher_type)
    mem_limit = getattr(settings, "ENRICHER_MEM_LIMIT", "256m")
    cpu_quota = getattr(settings, "ENRICHER_CPU_QUOTA", 50000)
    timeout = getattr(settings, "ENRICHER_TIMEOUT", 120)

    logger.info(
        "Launching enricher container: image=%r network=%r entries=%d",
        image,
        network_mode,
        len(entries),
    )

    import docker
    import docker.errors

    client = docker.from_env()
    job_path: str | None = None
    container = None
    raw_output: bytes = b""
    try:
        try:
            client.images.get(image)
        except docker.errors.ImageNotFound:
            logger.info("Enricher image %r not present locally; pulling", image)
            client.images.pull(image)

        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            suffix=".json",
            delete=False,
        ) as job_file:
            job_path = job_file.name
            job_file.write(job_json)
        os.chmod(job_path, 0o644)

        volumes = {job_path: {"bind": "/job.json", "mode": "ro"}}
        create_kw = dict(
            image=image,
            network_mode=network_mode,
            mem_limit=mem_limit,
            cpu_quota=cpu_quota,
            environment={},
            volumes=volumes,
            read_only=True,
            cap_drop=["ALL"],
            security_opt=["no-new-privileges:true"],
            tmpfs={"/tmp": "rw,nosuid,noexec,size=64m"},
        )

        container = client.containers.create(**create_kw)
        container.start()

        wait_result: dict = {}
        try:
            wait_result = container.wait(timeout=timeout)
        except requests.exceptions.ReadTimeout:
            logger.warning(
                "Enricher container %r exceeded wait timeout of %ss; sending SIGKILL",
                image,
                timeout,
            )
            try:
                container.kill()
            except docker.errors.APIError:
                pass
            try:
                wait_result = container.wait(timeout=60)
            except requests.exceptions.ReadTimeout:
                logger.warning("Enricher container %r did not exit promptly after kill", image)
                wait_result = {"StatusCode": -1}

        if wait_result.get("StatusCode", 0) != 0:
            err_log = container.logs(stdout=False, stderr=True, tail=256)
            logger.warning(
                "Enricher container %r exited with status %s stderr_tail=%r",
                image,
                wait_result.get("StatusCode"),
                err_log.decode("utf-8", errors="replace")[:2000],
            )

        raw_output = container.logs(stdout=True, stderr=False)
    finally:
        if container is not None:
            try:
                container.remove(force=True)
            except docker.errors.APIError:
                pass
        if job_path:
            try:
                os.unlink(job_path)
            except OSError:
                pass
        client.close()

    stdout = raw_output.decode("utf-8", errors="replace").strip()

    if not stdout:
        logger.warning("Enricher container %r produced no stdout output", image)
        return EnricherResult()

    result = deserialize_result(stdout)

    # Apply result to DB (Entry/Relation creation, warnings, errors)
    _apply_result(result, request, enricher_type, request.access_vector)

    return result
