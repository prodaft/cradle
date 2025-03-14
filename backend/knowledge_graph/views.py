from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from .serializers import GraphQueryRequestSerializer
from drf_spectacular.utils import extend_schema, extend_schema_view


@extend_schema_view(
    post=extend_schema(
        summary="Query Knowledge Graph",
        description="Traverse the knowledge graph using specified algorithm and parameters. "
                   "Supports BFS (breadth-first search) and pathfinding between nodes. "
                   "Results can be filtered by depth and entity types.",
        request=GraphQueryRequestSerializer,
        responses={
            200: {
                "description": "Successful graph traversal",
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "object",
                            "properties": {
                                "operation": {
                                    "type": "string",
                                    "enum": ["entry_types", "bfs", "pathfind", "inaccessible"],
                                    "description": "Graph traversal operation to perform"
                                },
                                "result_type": {
                                    "type": "string",
                                    "enum": ["vertices", "paths"],
                                    "description": "Type of results to return"
                                },
                                "params": {
                                    "type": "object",
                                    "properties": {
                                        "src": {
                                            "type": "object",
                                            "description": "Source entry for traversal"
                                        },
                                        "dst": {
                                            "type": "object",
                                            "description": "Destination entry for pathfinding (required for pathfind operation)"
                                        },
                                        "min_depth": {
                                            "type": "integer",
                                            "minimum": 1,
                                            "default": 1,
                                            "description": "Minimum depth for traversal"
                                        },
                                        "max_depth": {
                                            "type": "integer",
                                            "maximum": 3,
                                            "description": "Maximum depth for traversal"
                                        },
                                        "subtype": {
                                            "type": "string",
                                            "description": "Filter results by entry subtype (optional for BFS)"
                                        },
                                        "name": {
                                            "type": "string",
                                            "description": "Filter results by entry name (optional for BFS)"
                                        }
                                    },
                                    "required": ["src", "max_depth"]
                                }
                            },
                            "required": ["operation", "params", "result_type"]
                        }
                    }
                }
            },
            400: {"description": "Invalid query parameters"},
            401: {"description": "User is not authenticated"},
            403: {"description": "User does not have access to requested entities"}
        }
    )
)
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
