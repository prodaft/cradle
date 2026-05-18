"""Custom SMTP backend for CRADLE mail delivery."""

import ssl

from django.core.mail.backends.smtp import EmailBackend as SMTPBackend
from django.utils.functional import cached_property


class EmailBackend(SMTPBackend):
    """Custom SMTP backend that disables SSL verification when no client cert is configured.

    Used when NOCHECK_EMAIL_SSL=True for self-signed or internal mail servers.
    When ssl_certfile/ssl_keyfile are set, delegates to the parent implementation.
    """

    @cached_property
    def ssl_context(self) -> ssl.SSLContext:
        """SSL context: disables verification when no client cert, else uses parent."""
        if self.ssl_certfile or self.ssl_keyfile:
            return super().ssl_context
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        return ctx
