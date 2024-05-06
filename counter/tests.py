from django.test import TestCase
from django.urls import reverse
import json


class CounterViewTest(TestCase):
    def test_incremented(self):
        response_post = self.client.post(reverse("increase"))
        self.assertEqual(response_post.status_code, 200)
        response_get = self.client.get(reverse("read"))
        self.assertEqual(response_get.status_code, 200)

        counter = json.loads(response_get.content)
        self.assertEqual(counter[0]["value"], 1)
