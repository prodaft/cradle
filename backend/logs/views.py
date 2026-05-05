"""Event log API views."""

from django.db.models import Exists, OuterRef
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication

from core.exceptions import CoreErrorCodes
from core.openapi import get_common_error_responses, get_error_responses
from core.pagination import TotalPagesPagination
from user.permissions import HasAdminRole

from .filters import EventLogFilter
from .models import EventLog
from .serializers import EventLogSerializer


@extend_schema_view(
    get=extend_schema(
        operation_id="event_logs_list",
        summary="List event logs",
        description=(
            "Returns a paginated and filtered list of event logs. Only available to admin users. "
            "Omits log rows that are the ``src_log`` of another row (propagation source only); "
            "the propagated copy is listed instead."
        ),
        responses={
            200: TotalPagesPagination().get_paginated_response_serializer(EventLogSerializer),
            **get_error_responses(
                CoreErrorCodes.INVALID_PAGE_SIZE,
                CoreErrorCodes.PAGE_SIZE_TOO_LARGE,
            ),
            **get_common_error_responses(),
        },
    ),
)
class EventLogListView(ListAPIView):
    """List event logs with filtering and pagination. Admin only."""

    queryset = EventLog.objects.select_related("user", "content_type", "src_log").all()
    serializer_class = EventLogSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = EventLogFilter
    pagination_class = TotalPagesPagination

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, HasAdminRole]

    def get_queryset(self):
        qs = EventLog.objects.select_related("user", "content_type", "src_log").all()
        if getattr(self, "swagger_fake_view", False):
            return qs
        has_propagated_copy = EventLog.objects.filter(src_log_id=OuterRef("pk"))
        return qs.filter(~Exists(has_propagated_copy))
