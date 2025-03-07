from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from .serializers import GraphQueryRequestSerializer


class GraphTraverseView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        query = GraphQueryRequestSerializer(
            data=request.data, context={"request": request}
        )
        query.is_valid(raise_exception=True)

        result = query.get_result()
        return Response(result)
