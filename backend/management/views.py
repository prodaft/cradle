from rest_framework import generics, status
from django.core.cache import cache
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Setting
from .serializers import SettingSerializer
from user.permissions import HasAdminRole
from rest_framework.permissions import IsAuthenticated


class SettingListCreateView(generics.ListCreateAPIView):
    queryset = Setting.objects.all()
    serializer_class = SettingSerializer
    permission_classes = [IsAuthenticated, HasAdminRole]

    def perform_create(self, serializer):
        instance = serializer.save()
        cache.set(f"setting:{instance.key}", instance.value, timeout=300)


class ActionView(APIView):
    permission_classes = [IsAuthenticated, HasAdminRole]

    def post(self, request, action_name=None, *args, **kwargs):
        handler = getattr(self, "action_" + action_name, None)
        if handler and callable(handler):
            return handler(request, *args, **kwargs)
        return Response(
            {"error": f"Unknown action: {action_name}"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Example action
    def clear_cache(self, request, *args, **kwargs):
        from django.core.cache import cache

        cache.clear()
        return Response({"message": "Cache cleared successfully."})
