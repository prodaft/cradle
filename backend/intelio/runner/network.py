"""Docker network management for enricher containers.

Enrichers that need outbound internet access run on a dedicated ``enricher_external``
network that has no route to the internal Cradle services (Postgres, RabbitMQ, Redis,
MinIO).  Enrichers that do not need network access run with ``--network none``.
"""

import logging

logger = logging.getLogger(__name__)

# Network mode constants used in EnricherSettings.settings["network"]
NETWORK_NONE = "none"
NETWORK_EXTERNAL = "external"


def ensure_enricher_network(network_name: str) -> None:
    """Create the named Docker bridge network if it does not already exist.

    The network is created with ``internal=False`` so containers can reach the
    public internet, but it is completely separate from the default ``bridge``
    network used by Cradle's own services.

    This is idempotent: calling it multiple times is safe.
    """
    import docker
    import docker.errors

    client = docker.from_env()
    try:
        client.networks.get(network_name)
        logger.debug("Docker network %r already exists", network_name)
    except docker.errors.NotFound:
        client.networks.create(
            name=network_name,
            driver="bridge",
            internal=False,
            labels={"cradle.managed": "true", "cradle.purpose": "enricher-external"},
        )
        logger.info("Created Docker network %r for enricher containers", network_name)
    finally:
        client.close()


def resolve_network_mode(enricher_network_setting: str, external_network_name: str) -> str:
    """Return the Docker network mode string for a container.

    Args:
        enricher_network_setting: Value from ``EnricherSettings.settings["network"]``.
            Either ``"none"`` (default) or ``"external"``.
        external_network_name: Name of the pre-created external Docker network
            (from ``settings.ENRICHER_EXTERNAL_NETWORK``).

    Returns:
        A string suitable for the ``network_mode`` parameter of
        ``docker.containers.run()``.  For ``"external"`` the named network must
        already exist (call :func:`ensure_enricher_network` first).
    """
    if enricher_network_setting == NETWORK_EXTERNAL:
        return external_network_name
    return NETWORK_NONE
