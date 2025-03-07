from rest_framework.generics import ListAPIView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication

from user.permissions import HasAdminRole
from .models import EventLog
from .filters import EventLogFilter
from .serializers import EventLogSerializer  # Create this serializer in step 3


class EventLogListView(ListAPIView):
    queryset = EventLog.objects.all()
    serializer_class = EventLogSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = EventLogFilter

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, HasAdminRole]
