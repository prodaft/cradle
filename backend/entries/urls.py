from django.urls import path

from .views import entry_view
from .views import entity_views
from .views import entry_class_views
from .views import relation_view

urlpatterns = [
    path(
        "entry_classes/",
        entry_class_views.EntryClassList.as_view(),
        name="entry_class_list",
    ),
    path(
        "entry_classes/<path:class_subtype>/",
        entry_class_views.EntryClassDetail.as_view(),
        name="entry_class_detail",
    ),
    path("entities/", entity_views.EntityList.as_view(), name="entity_list"),
    path(
        "entities/<uuid:entity_id>/",
        entity_views.EntityDetail.as_view(),
        name="entity_detail",
    ),
    path(
        "next_name/<path:class_subtype>/",
        entry_class_views.NextName.as_view(),
        name="next_name",
    ),
    path("entries/", entry_view.EntryView.as_view(), name="entry-list-create"),
    path(
        "entries/<uuid:id>/", entry_view.EntryDetailView.as_view(), name="entry-detail"
    ),
    path("relations/", relation_view.RelationListView.as_view(), name="relation-list"),
    path(
        "relations/<uuid:relation_id>/",
        relation_view.RelationDetailView.as_view(),
        name="relation-detail",
    ),
]
