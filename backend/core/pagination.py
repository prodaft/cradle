from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from drf_spectacular.utils import inline_serializer
from rest_framework import serializers


class TotalPagesPagination(PageNumberPagination):
    def __init__(self, *args, page_size=10, **kwargs):
        self.page_size = page_size
        super().__init__(*args, **kwargs)

    def get_paginated_response(self, data):
        return Response(
            {
                "page": self.page.number,
                "count": self.page.paginator.count,
                "total_pages": self.page.paginator.num_pages,
                "results": data,
            }
        )

    def get_paginated_response_schema(self, schema):
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
        """
        Returns an inline serializer for the paginated response.

        Args:
            serializer_class: The serializer class for the results
            name: Optional name for the inline serializer (auto-generated if not provided)
        """
        if name is None:
            name = f"Paginated{serializer_class.__name__}Response"

        return inline_serializer(
            name=name,
            fields={
                "page": serializers.IntegerField(help_text="Current page number"),
                "count": serializers.IntegerField(help_text="Total number of items"),
                "total_pages": serializers.IntegerField(
                    help_text="Total number of pages"
                ),
                "results": serializer_class(many=many),
            },
        )


class LazyPaginator(PageNumberPagination):
    def __init__(self, *args, page_size=10, **kwargs):
        self.page_size = page_size
        super().__init__(*args, **kwargs)

    def get_paginated_response(self, data):
        return Response(
            {
                "page": self.page.number,
                "has_next": self.page.has_next(),
                "results": data,
            }
        )

    def get_paginated_response_schema(self, schema):
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

    def get_paginated_response_serializer(self, serializer_class, name=None):
        """
        Returns an inline serializer for the paginated response.

        Args:
            serializer_class: The serializer class for the results
            name: Optional name for the inline serializer (auto-generated if not provided)
        """
        if name is None:
            name = f"Paginated{serializer_class.__name__}Response"

        return inline_serializer(
            name=name,
            fields={
                "page": serializers.IntegerField(help_text="Current page number"),
                "has_next": serializers.BooleanField(
                    help_text="Whether there are more pages available"
                ),
                "results": serializer_class(many=True),
            },
        )
