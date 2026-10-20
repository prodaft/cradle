from unittest.mock import patch

from django.test import SimpleTestCase

from ..models import Attachment
from ..serializers import AttachmentSerializer


class AttachmentSerializerTest(SimpleTestCase):
    def test_presigned_url_sanitizes_attachment_name(self):
        """Attachment names come from enricher output; a quote must not break out of the filename."""
        attachment = Attachment(name='evil".png', file="relations/evil.png")

        with patch("entries.serializers.presign_get", return_value="https://example.com/a") as presign:
            AttachmentSerializer().get_presigned_url(attachment)

        self.assertEqual(presign.call_args.kwargs["response_content_disposition"], 'attachment; filename="evil_.png"')
