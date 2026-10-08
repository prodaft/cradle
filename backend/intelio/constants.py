"""IntelIO constants: user-visible enrichment messages (never raw exception text)."""

INTELIO_ENRICHMENT_MESSAGE_INIT_FAILED = "Could not connect to this service. Check configuration and credentials."
INTELIO_ENRICHMENT_MESSAGE_REQUEST_FAILED = "The external request could not be completed. Try again later."
INTELIO_ENRICHMENT_MESSAGE_FINISH_FAILED = "Enrichment could not finish. Try again later."
INTELIO_ENRICHMENT_MESSAGE_DNS_LOOKUP_FAILED = "DNS lookup could not be completed."
INTELIO_ENRICHMENT_MESSAGE_REMOTE_SEARCH_FAILED = "The remote service reported an error for this search."

INTELIO_ENRICHMENT_MESSAGE_ACTION_DENIED = {
    "view": "You do not have permission to view this enrichment.",
    "delete": "You do not have permission to delete this enrichment.",
    "restart": "You do not have permission to restart this enrichment.",
}
INTELIO_ENRICHMENT_MESSAGE_ACTION_DENIED_DEFAULT = (
    "You do not have permission to perform this action on this enrichment."
)

# OpenCTI enricher: fields stripped from API payloads for lighter storage (see Cortex-Analyzers/opencti).
INTELIO_OPENCTI_RESULT_TRIM_MAP = {
    "observable": [
        "objectMarkingIds",
        "objectLabelIds",
        "externalReferencesIds",
        "indicatorsIds",
        "parent_types",
    ],
    "report": {
        "objects",
        "objectMarkingIds",
        "externalReferencesIds",
        "objectLabelIds",
        "parent_types",
        "objectsIds",
        "x_opencti_graph_data",
    },
}

# Falcon digest: Celery chunk sizes for objects and relations.
INTELIO_FALCON_DIGEST_CHUNK_SIZE = 1000
INTELIO_FALCON_DIGEST_REL_CHUNK_SIZE = 4000
