from django.urls import reverse

from .utils import GraphTestCase


class GraphPathFindTest(GraphTestCase):
    def setUp(self):
        super().setUp()
        self.src = self.entity("a")
        self.dst = self.entity("b")

    def find_path(self, dst):
        self.refresh_edges()
        return self.get_json(reverse("graph_path_find"), {"src": self.src.id, "dsts": dst.id})

    def test_out_of_range_date_is_400(self):
        for param in ("last_seen_at_gte", "created_at_lte"):
            with self.subTest(param=param):
                response = self.client.get(
                    reverse("graph_path_find"),
                    {"src": self.src.id, "dsts": self.dst.id, param: "2025-13-45T00:00"},
                    **self.headers,
                )
                self.assertEqual(response.status_code, 400, response.content)

    def test_path_query_count_does_not_grow_with_path_length(self):
        self.link(self.src, self.dst)
        short, short_queries = self.find_path(self.dst)
        self.assertEqual(len(short["relations"]), 1)

        prev = self.src
        far = self.entity("far")
        for hop in [*(self.entity(f"h{i}") for i in range(3)), far]:
            self.link(prev, hop)
            prev = hop
        long, long_queries = self.find_path(far)

        self.assertEqual(len(long["relations"]), 4)
        self.assertEqual(short_queries, long_queries)

    def test_degree_counts_links_within_the_path(self):
        mid = self.entity("mid")
        self.link(self.src, mid)
        self.link(mid, self.dst)
        data, _ = self.find_path(self.dst)

        degrees = {e["name"]: e["degree"] for group in data["entries"]["entities"].values() for e in group}
        self.assertEqual(degrees, {"a": 1, "mid": 2, "b": 1})
