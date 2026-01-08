from drf_spectacular.extensions import OpenApiAuthenticationExtension


class CollabHmacAuthenticationScheme(OpenApiAuthenticationExtension):
    target_class = "internal.authentication.CollabHmacAuthentication"
    name = "CollabHmac"

    def get_security_requirement(self, auto_schema):
        return {"CollabHmac": []}

    def get_security_definition(self, auto_schema):
        return {
            "type": "apiKey",
            "in": "header",
            "name": "X-Collab-Signature",
            "description": (
                "HMAC signature of {timestamp}.{method}.{path}.{body}. "
                "Requires X-Collab-Timestamp header."
            ),
        }
