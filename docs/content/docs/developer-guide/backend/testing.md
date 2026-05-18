+++
title = "Testing"
date = "2025-03-05T12:55:52+01:00"
draft = false
weight = 11
+++

## Structure of tests

Tests live in each app's tests module. Test files should follow:

```
test_<filename>.py
```

Each module typically includes a `utils.py` with a subclass of Django's testing
class that provides mocks and utilities.

## Setting up tests for a new application

1. Create a `tests` directory.
2. Add an `__init__.py` file.
3. Create a `utils.py` file with test utilities.

Example:

```python
from django.test import TestEntity
from unittest.mock import patch
from collections import Counter

class HelloWorldTestEntity(TestEntity):
    def setUp(self):
        self.patcher = patch("file_transfer.utils.MinioClient.create_user_bucket")
        self.mocked_create_user_bucket = self.patcher.start()

    def tearDown(self):
        self.patcher.stop()
```

## Writing tests

Override the custom test class from utils.py:

```python
from .utils import HelloWorldTestEntity
from django.urls import reverse

class LinkSerializerTest(HelloWorldTestEntity):
    def setUp(self):
        super().setUp()

    def test_hello_world_is_successful(self):
        response = self.client.get(reverse("helloworld_list"))
        self.assertEqual(response.status_code, 200)
```

Run tests with:

```shell
python manage.py test newapp
```
