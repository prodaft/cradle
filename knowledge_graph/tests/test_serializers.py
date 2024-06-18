from .utils import KnowledgeGraphTestCase
from ..serializers import LinkSerializer


class LinkSerializerTest(KnowledgeGraphTestCase):

    def setUp(self):
        super().setUp()

    def test_to_representation(self):
        data = {"first_node": 1, "second_node": 2}
        expected = {"source": 1, "target": 2}

        self.assertEqual(LinkSerializer(data).to_representation(data), expected)
