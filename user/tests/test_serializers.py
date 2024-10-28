from ..serializers import TokenObtainSerializer
from ..models import CradleUser
from .utils import UserTestCase


class TokenObtainSerializerTest(UserTestCase):

    def setUp(self):
        super().setUp()

        self.token_serializer = TokenObtainSerializer()
        self.normal_user = CradleUser.objects.create_user(
            username="user", password="pass1", email="alabala@a.b"
        )
        self.admin_user = CradleUser.objects.create_superuser(
            username="admin", password="pass2", email="bla@a.b"
        )

    def test_get_token_normal_user(self):
        token = self.token_serializer.get_token(self.normal_user)
        self.assertEqual(token["is_admin"], False)

    def test_get_token_admin_user(self):
        token = self.token_serializer.get_token(self.admin_user)
        self.assertEqual(token["is_admin"], True)
