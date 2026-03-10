"""URL routing for entries app: entry classes, entities, entries, relations."""

from django.urls import path

from .views import entity_views, entry_class_views, entry_view, relation_view

urlpatterns = [
    path(
        "entry-classes/",
        entry_class_views.EntryClassList.as_view(),
        name="entry_class_list",
    ),
    path(
        "entry-classes/<path:class_subtype>/",
        entry_class_views.EntryClassDetail.as_view(),
        name="entry_class_detail",
    ),
    path("entities/", entity_views.EntityList.as_view(), name="entity_list"),
    path(
        "entities/<int:entity_id>/",
        entity_views.EntityDetail.as_view(),
        name="entity_detail",
    ),
    path(
        "next-name/<path:class_subtype>/",
        entry_class_views.NextName.as_view(),
        name="next_name",
    ),
    path("entries/", entry_view.EntryView.as_view(), name="entry_create"),
    path("entries/<int:entry_id>/", entry_view.EntryDetailView.as_view(), name="entry_detail"),
    path("relations/", relation_view.RelationListView.as_view(), name="relation_list"),
    path(
        "relations/<uuid:relation_id>/",
        relation_view.RelationDetailView.as_view(),
        name="relation_detail",
    ),
]
