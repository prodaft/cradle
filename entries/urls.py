from django.urls import path
from .views import entity_views
from .views import entry_class_views

urlpatterns = [
    path("entry_classes/", entry_class_views.EntryClassList.as_view(), name="entry_class_list"),
    path("entry_classes/<path:class_subtype>/", entry_class_views.EntryClassDetail.as_view(), name="entry_class_detail"),
    path("entities/", entity_views.EntityList.as_view(), name="entity_list"),
    path("entities/<uuid:entity_id>/", entity_views.EntityDetail.as_view(), name="entity_detail"),
]
