+++
title = "Structure of Tests"
date = "2025-03-05T12:55:52+01:00"
linkTitle = "Testing"
draft = false
weight = 3
+++

## Structure of Tests

Tests are organized within each application’s `tests` module. Test files should be named following the pattern:
```
test_<filename>.py
```
Within each module, a `utils.py` file is typically provided that includes a subclass of Django’s testing class (e.g., `TestEntity`) with mocks and utility methods.

## Setting Up Tests for a New Application

To set up tests for a new application:

1. Create a `tests` directory.
2. Add an `__init__.py` file.
3. Create a `utils.py` file with your test utilities.

Example snippet:

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

## Writing Tests

Tests use Django’s testing framework (built on Python’s `unittest`). Override your custom test class from `utils.py` as shown below:

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

Run your tests with:

```shell
python manage.py test newapp
```
