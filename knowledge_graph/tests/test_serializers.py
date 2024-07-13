from .utils import KnowledgeGraphTestEntity
from ..serializers import LinkSerializer

from uuid import UUID


class LinkSerializerTest(KnowledgeGraphTestEntity):

    def setUp(self):
        super().setUp()

    def test_to_representation(self):
        data = {"first_node": UUID(int=1), "second_node": UUID(int=2)}
        expected = {"source": str(UUID(int=1)), "target": str(UUID(int=2))}

        self.assertEqual(LinkSerializer(data).to_representation(data), expected)
