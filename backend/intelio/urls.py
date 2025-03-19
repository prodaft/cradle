from django.urls import path
from .views.mappings import (
    ClassMappingSubclassesAPIView,
    MappingSchemaView,
    MappingKeysSchemaView,
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
]
