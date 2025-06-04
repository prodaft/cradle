from django.db import IntegrityError
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from django.apps import apps

from ..models.base import ClassMapping
from ..serializers import ClassMappingSerializer
from core.utils import fields_to_form
from user.permissions import HasEntryManagerRole


class ClassMappingSubclassesAPIView(APIView):
    """
    DRF API view that returns a list of all subclasses of ClassMapping
    with their names.
    """

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, HasEntryManagerRole]

    def get(self, request, *args, **kwargs):
        subclasses = ClassMapping.__subclasses__()

        subclass_names = [
            {"class": subclass.__name__, "name": subclass.display_name}
            for subclass in subclasses
            if hasattr(subclass, "display_name")
        ]
        return Response(subclass_names)


class MappingKeysSchemaView(APIView):
    """
    Given a class name, return the possible values in a mapping.
    """

    permission_classes = [IsAuthenticated, HasEntryManagerRole]

    def get(self, request, class_name):
        try:
            mapping_class = apps.get_model(app_label="intelio", model_name=class_name)
        except LookupError:
            return Response({"error": "Invalid class name"}, status=400)

        if not issubclass(mapping_class, ClassMapping) or mapping_class._meta.abstract:
            return Response({"error": "Not a valid mapping class"}, status=400)

        field_mapping = fields_to_form({f.name: f for f in mapping_class._meta.fields})

        return Response(field_mapping)


class MappingSchemaView(APIView):
    """
    Given a class name, return the possible values in a mapping.
    """

    permission_classes = [IsAuthenticated, HasEntryManagerRole]

    def get(self, request, class_name):
        try:
            mapping_class = apps.get_model(app_label="intelio", model_name=class_name)
        except LookupError:
            return Response({"error": "Invalid class name"}, status=400)

        if not issubclass(mapping_class, ClassMapping) or mapping_class._meta.abstract:
            return Response({"error": "Not a valid mapping class"}, status=400)

        mappings = mapping_class.objects.all()
        serializer = ClassMappingSerializer.get_serializer(mapping_class)

        return Response(serializer(mappings, many=True).data)

    def post(self, request, class_name):
        try:
            mapping_class = apps.get_model(app_label="intelio", model_name=class_name)
        except LookupError:
            return Response({"error": "Invalid class name"}, status=400)

        if not issubclass(mapping_class, ClassMapping) or mapping_class._meta.abstract:
            return Response({"error": "Not a valid mapping class"}, status=400)

        values = {}

        for f in mapping_class._meta.fields:
            if f.name in request.data:
                values[f.name] = request.data[f.name]

        if "internal_class" not in values:
            return Response({"error": "internal_class is required"}, status=400)

        mappingf = mapping_class.objects.filter(
            id=values.pop("id", None),
        )

        values["internal_class_id"] = values.pop("internal_class")

        serializer = ClassMappingSerializer.get_serializer(mapping_class)

        try:
            if mappingf.exists():
                mappingf.update(**values)
                return Response(serializer(mappingf.first()).data)
            else:
                mapping = mapping_class.objects.create(**values)
                return Response(serializer(mapping).data)
        except IntegrityError as e:
            return Response({"error": str(e)}, status=400)

    def delete(self, request, class_name):
        try:
            mapping_class = apps.get_model(app_label="intelio", model_name=class_name)
        except LookupError:
            return Response({"error": "Invalid class name"}, status=400)

        if not issubclass(mapping_class, ClassMapping) or mapping_class._meta.abstract:
            return Response({"error": "Not a valid mapping class"}, status=400)

        id = request.query_params.get("mapping_id")

        if not id:
            return Response({"error": "mapping_id is required"}, status=400)

        mapping = mapping_class.objects.filter(id=id)

        if not mapping.exists():
            return Response({"error": "Mapping not found"}, status=404)

        return Response(mapping.delete())
