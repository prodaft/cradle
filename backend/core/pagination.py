from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


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
