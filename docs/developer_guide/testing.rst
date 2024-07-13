Structure of Tests
==================

Tests for an application are placed inside the application in a module called `tests`. The naming convention for a test file is `test_<filename>` for a test which tests the functionality of a folder. Inside the module, there is always a `utils.py` file, which contains a child of the standard Django `TestEntity` class that performs the necessary mocks and other utility methods specific to the application.

Setting Up Tests for a New Application
--------------------------------------

To set up tests for a new application, the `tests` module first needs to be created together with the corresponding `__init__.py` and `utils.py` files.

.. code-block:: python

    from django.test import TestEntity
    from unittest.mock import patch
    from collections import Counter

    class HelloWorldTestEntity(TestEntity):
        def setUp(self):
            self.patcher = patch("file_transfer.utils.MinioClient.create_user_bucket")
            self.mocked_create_user_bucket = self.patcher.start()

        def tearDown(self):
            self.patcher.stop()

Writing Tests in the Application
--------------------------------

Tests are written using the standard Django testing functionality, which is a derivative of the `unittest` library in Python.

Tests for an application need to override the child of `TestEntity` defined in the `utils.py` file inside the `tests` module.

.. code-block:: python

    from .utils import HelloWorldTestEntity
    from django.urls import reverse

    class LinkSerializerTest(HelloWorldTestEntity):
        def setUp(self):
            super().setUp()

        def test_hello_world_is_successful(self):
            response = self.client.get(reverse("helloworld_list"))
            self.assertEqual(response.status_code, 200)

The test can then be run using the command:

.. code-block:: shell

    python manage.py test newapp
