from django.urls import path
from .views import lsp_pack_view

urlpatterns = [
    path("pack/", lsp_pack_view.LspPack.as_view(), name="lsp_pack_view"),
]
