"""Pagination classes and mixins for REST API responses.

Provides TotalPagesPagination (page, count, total_pages, results),
LazyPaginator (page, has_next, results), and PageSizeValidationMixin
for page_size validation and max_page_size enforcement.
"""

from drf_spectacular.utils import inline_serializer
from rest_framework import serializers, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from .validators import validate_page_size


class PageSizeValidationMixin:
    """Mixin for page_size query param validation and max_page_size enforcement.

    Validates the page_size query parameter and caps it at max_page_size.
    """

    page_size_query_param = "page_size"

    def __init__(self, *args, page_size=10, max_page_size=200, **kwargs):
        """Initialize pagination with page size limits.

        Args:
            page_size: Default items per page.
            max_page_size: Maximum allowed page_size from query params.
        """
        self.page_size = page_size
        self.max_page_size = max_page_size
        super().__init__(*args, **kwargs)

    def get_page_size(self, request):
        """Return validated page size from request or default."""
        if request is None:
            return self.page_size
        return validate_page_size(
            request.query_params.get("page_size", str(self.page_size)),
            default=self.page_size,
            max_size=self.max_page_size,
        )


class TotalPagesPagination(PageSizeValidationMixin, PageNumberPagination):
    """Pagination with page, count, total_pages, and results.

    Use when total item count is known (e.g. database queries).
    """

    def get_paginated_response(self, data):
        """Build response with page, count, total_pages, and results."""
        return Response(
            {
                "page": self.page.number,
                "count": self.page.paginator.count,
                "total_pages": self.page.paginator.num_pages,
                "results": data,
            }
        )

    @staticmethod
    def format_single_page_response(count: int, data):
        """Build paginated response for single-page custom data (e.g. full graph)."""
        return Response(
            {
                "page": 1,
                "count": count,
                "total_pages": 1,
                "results": data,
            },
            status=status.HTTP_200_OK,
        )

    def get_paginated_response_schema(self, schema):
        """Return OpenAPI schema for paginated response."""
        return {
            "type": "object",
            "properties": {
                "page": {
                    "type": "integer",
                    "example": 1,
                    "description": "Current page number",
                },
                "count": {
                    "type": "integer",
                    "example": 100,
                    "description": "Total number of items",
                },
                "total_pages": {
                    "type": "integer",
                    "example": 10,
                    "description": "Total number of pages",
                },
                "results": schema,
            },
            "required": ["page", "count", "total_pages", "results"],
        }

    def get_paginated_response_serializer(self, serializer_class, name=None, many=True):
        """Returns an inline serializer for the paginated response.

        Args:
            serializer_class: The serializer class for the results.
            name: Optional name for the inline serializer (auto-generated if not provided).
            many: Whether results is a list (True) or single object (False).
        """
        if name is None:
            name = f"Paginated{serializer_class.__name__}Response"

        return inline_serializer(
            name=name,
            fields={
                "page": serializers.IntegerField(help_text="Current page number"),
                "count": serializers.IntegerField(help_text="Total number of items"),
                "total_pages": serializers.IntegerField(help_text="Total number of pages"),
                "results": serializer_class(many=many),
            },
        )


class LazyPaginator(PageSizeValidationMixin, PageNumberPagination):
    """Pagination with page, has_next, and results (no total count).

    Use when total count is expensive or unavailable (e.g. streaming, large datasets).
    """

    def get_paginated_response(self, data):
        """Build response with page, has_next, and results."""
        return Response(
            {
                "page": self.page.number,
                "has_next": self.page.has_next(),
                "results": data,
            }
        )

    @staticmethod
    def format_response(page_number: int, has_next: bool, data):
        """Build lazy-paginated response for custom pagination logic."""
        return Response(
            {
                "page": page_number,
                "has_next": has_next,
                "results": data,
            },
            status=status.HTTP_200_OK,
        )

    def get_paginated_response_schema(self, schema):
        """Return OpenAPI schema for lazy paginated response."""
        return {
            "type": "object",
            "properties": {
                "page": {
                    "type": "integer",
                    "example": 1,
                    "description": "Current page number",
                },
                "has_next": {
                    "type": "boolean",
                    "example": True,
                    "description": "Whether there are more pages available",
                },
                "results": schema,
            },
            "required": ["page", "has_next", "results"],
        }

    def get_paginated_response_serializer(self, serializer_class, name=None, many=True):
        """Returns an inline serializer for the paginated response.

        Args:
            serializer_class: The serializer class for the results.
            name: Optional name for the inline serializer (auto-generated if not provided).
            many: Whether results is a list (True) or single object (False).
        """
        if name is None:
            name = f"LazyPaginated{serializer_class.__name__}Response"

        return inline_serializer(
            name=name,
            fields={
                "page": serializers.IntegerField(help_text="Current page number"),
                "has_next": serializers.BooleanField(help_text="Whether there are more pages available"),
                "results": serializer_class(many=many),
            },
        )
