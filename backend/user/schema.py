from drf_spectacular.extensions import OpenApiAuthenticationExtension


def api_key_example():
    return "YOUR_API_KEY_HERE"


class APIKeyAuthenticationScheme(OpenApiAuthenticationExtension):
    target_class = "user.authentication.APIKeyAuthentication"
    name = "ApiKey"

    def get_security_requirement(self, auto_schema):
        return {"ApiKey": []}

    def get_security_definition(self, auto_schema):
        return {
            "type": "apiKey",
            "in": "header",
            "name": "Api-Key",
            "description": "API key authentication. The value must be prefixed with 'Api-Key '.",
        }
