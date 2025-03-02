from django.urls import path
from .views import lsp_view

urlpatterns = [
    path("types/", lsp_view.LspTypes.as_view(), name="lsp_types_view"),
    path("trie/", lsp_view.CompletionTrie.as_view(), name="completion_trie_view"),
]
