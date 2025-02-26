import ssl
from django.core.mail.backends.smtp import EmailBackend as SMTPBackend
from django.utils.functional import cached_property
from django.conf import settings as django_settings


class EmailBackend(SMTPBackend):
    @cached_property
    def ssl_context(self):
        if self.ssl_certfile or self.ssl_keyfile:
            ssl_context = ssl.SSLContext(protocol=ssl.PROTOCOL_TLS_CLIENT)
            # set verify location:
            if (
                hasattr(django_settings, "CA_PATH")
                and django_settings.CA_PATH is not None
            ):
                ssl_context.load_verify_locations(capath=django_settings.CA_PATH)
            ssl_context.load_cert_chain(self.ssl_certfile, self.ssl_keyfile)
            return ssl_context
        else:
            ssl_context = ssl.create_default_context()
            return ssl_context
