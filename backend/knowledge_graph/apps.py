"""Knowledge graph app: graph traversal, path finding, and neighbor queries."""

from django.apps import AppConfig


class KnowledgeGraphConfig(AppConfig):
    """App config for knowledge graph views and utilities."""

    name = "knowledge_graph"
    verbose_name = "Knowledge Graph"
