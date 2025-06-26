from rest_framework.generics import ListAPIView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from drf_spectacular.utils import extend_schema

from user.permissions import HasAdminRole
from .models import EventLog
from .filters import EventLogFilter
from .serializers import EventLogSerializer  # Create this serializer in step 3


@extend_schema(
    summary="List event logs",
    description="Returns a filtered list of event logs. Only available to admin users.",
    responses={
        200: EventLogSerializer(many=True),
        401: {"description": "User is not authenticated"},
        403: {"description": "User is not authorized to view logs"},
    },
)
class EventLogListView(ListAPIView):
    queryset = EventLog.objects.all()
    serializer_class = EventLogSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = EventLogFilter

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, HasAdminRole]
