"""URL routing for intelio API: digests, enrichment, and mappings."""

from django.urls import path

from .views.digest import (
    DigestAPIView,
    DigestDetailAPIView,
    DigestSubclassesAPIView,
    DigestUploadAPIView,
    DigestUploadFinalizeAPIView,
)
from .views.enrichment import (
    EnrichmentAPIView,
    EnrichmentDetailAPIView,
    EnrichmentRelationsAPIView,
    EnrichmentRequestEnricherAPIView,
    EnrichmentRestartAPIView,
    EnrichmentSettingsAPIView,
    EnrichmentSubclassesAPIView,
)
from .views.mappings import (
    ClassMappingSubclassesAPIView,
    MappingDetailView,
    MappingKeysSchemaView,
    MappingSchemaView,
)

urlpatterns = [
    # Mappings: the mapping classes, then the mappings of one class.
    path("mappings/", ClassMappingSubclassesAPIView.as_view(), name="classmapping_subclasses"),
    path("mappings/<str:class_name>/", MappingSchemaView.as_view(), name="mapping_schema"),
    path("mappings/<str:class_name>/keys/", MappingKeysSchemaView.as_view(), name="mapping_keys_schema"),
    path("mappings/<str:class_name>/<uuid:mapping_id>/", MappingDetailView.as_view(), name="mapping_detail"),
    # Enrichers: the available enrichment implementations and their settings.
    path("enrichers/", EnrichmentSubclassesAPIView.as_view(), name="enrichment_subclasses"),
    path("enrichers/<str:enricher_type>/", EnrichmentSettingsAPIView.as_view(), name="enrichment_schema"),
    # Digests: imported files, their available types, and two-step uploads.
    path("digest-types/", DigestSubclassesAPIView.as_view(), name="digest_subclasses"),
    path("digests/", DigestAPIView.as_view(), name="digest_list"),
    path("digests/uploads/", DigestUploadAPIView.as_view(), name="digest_upload"),
    path(
        "digests/uploads/<uuid:upload_id>/finalize/",
        DigestUploadFinalizeAPIView.as_view(),
        name="digest_upload_finalize",
    ),
    path("digests/<uuid:digest_id>/", DigestDetailAPIView.as_view(), name="digest_detail"),
    # Enrichments: requests to run enrichers on an artifact, and each enricher's results.
    path("enrichments/", EnrichmentAPIView.as_view(), name="enrichment_requests"),
    path("enrichments/<uuid:enrichment_id>/", EnrichmentDetailAPIView.as_view(), name="enrichment_detail"),
    path("enrichments/<uuid:enrichment_id>/restart/", EnrichmentRestartAPIView.as_view(), name="enrichment_restart"),
    path(
        "enrichments/<uuid:enrichment_id>/enrichers/<str:enricher_type>/",
        EnrichmentRequestEnricherAPIView.as_view(),
        name="enrichment_enricher",
    ),
    path(
        "enrichments/<uuid:enrichment_id>/enrichers/<str:enricher_type>/relations/",
        EnrichmentRelationsAPIView.as_view(),
        name="enrichment_relations",
    ),
]
