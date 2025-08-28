from django.urls import path

from intelio.views.digest import DigestAPIView, DigestSubclassesAPIView

from .views.enrichment import (
    EnrichmentAPIView,
    EnrichmentDetailAPIView,
    EnrichmentSettingsAPIView,
    EnrichmentSubclassesAPIView,
)
from .views.mappings import (
    ClassMappingSubclassesAPIView,
    MappingKeysSchemaView,
    MappingSchemaView,
)

urlpatterns = [
    path(
        "mappings/",
        ClassMappingSubclassesAPIView.as_view(),
        name="classmapping-subclasses",
    ),
    path(
        "mappings/<str:class_name>/",
        MappingSchemaView.as_view(),
        name="mapping-schema",
    ),
    path(
        "mappings/<str:class_name>/keys",
        MappingKeysSchemaView.as_view(),
        name="mapping-keys-schema",
    ),
    path(
        "enrichment/",
        EnrichmentSubclassesAPIView.as_view(),
        name="enrichment-subclasses",
    ),
    path(
        "enrichment/<str:enricher_type>/",
        EnrichmentSettingsAPIView.as_view(),
        name="enrichment-schema",
    ),
    path(
        "digest/options/",
        DigestSubclassesAPIView.as_view(),
        name="enrichment-subclasses",
    ),
    path(
        "digest/",
        DigestAPIView.as_view(),
        name="enrichment-subclasses",
    ),
    path(
        "enrich/",
        EnrichmentAPIView.as_view(),
        name="enrichment-requests",
    ),
    path(
        "enrich/<uuid:pk>/",
        EnrichmentDetailAPIView.as_view(),
        name="enrichment-detail",
    ),
]
