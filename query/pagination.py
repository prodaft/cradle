from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class QueryPagination(PageNumberPagination):
    def __init__(self, *args, page_size=10, **kwargs):
        self.page_size = page_size
        super().__init__(*args, **kwargs)

    def get_paginated_response(self, data):
        return Response(
            {
                "links": {
                    "next": self.get_next_link(),
                    "previous": self.get_previous_link(),
                },
                "page": self.page.number,
                "count": self.page.paginator.count,
                "total_pages": self.page.paginator.num_pages,
                "results": data,
            }
        )
