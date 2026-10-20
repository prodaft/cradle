from django.urls import reverse

from .utils import GraphTestCase


class GraphNeighborsTest(GraphTestCase):
    def neighbors(self, src):
        self.refresh_edges()
        return self.get_json(reverse("graph_neighbors_query"), {"src": src.id, "depth": 1, "page_size": 50})

    def test_query_count_does_not_grow_with_neighbors(self):
        src = self.entity("src")
        self.link(src, self.entity("n0"))
        few, few_queries = self.neighbors(src)

        for i in range(1, 6):
            self.link(src, self.entity(f"n{i}"))
        many, many_queries = self.neighbors(src)

        self.assertGreater(len(many["results"]), len(few["results"]))
        self.assertEqual(few_queries, many_queries)
