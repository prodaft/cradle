from .utils import KnowledgeGraphTestCase
from ..serializers import LinkSerializer

from uuid import UUID


class LinkSerializerTest(KnowledgeGraphTestCase):
    def setUp(self):
        super().setUp()

    def test_to_representation(self):
        data = (UUID(int=1), UUID(int=2))
        expected = {"source": UUID(int=1), "target": UUID(int=2)}
        print(LinkSerializer(data).to_representation(data))

        self.assertEqual(LinkSerializer(data).to_representation(data), expected)
