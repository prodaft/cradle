from django.test import RequestFactory, override_settings

from core.exception_handler import custom_exception_handler


def test_unhandled_exception_returns_json_500_generic_detail_when_debug_off():
    """Unhandled errors return RFC7807 JSON with generic detail when DEBUG is off."""
    request = RequestFactory().get("/api/entities/")
    with override_settings(DEBUG=False):
        response = custom_exception_handler(RuntimeError("sensitive internals"), {"request": request})
    assert response.status_code == 500
    assert response.data["code"] == "INTERNAL_SERVER_ERROR"
    assert response.data["type"] == "/errors/internal-server-error"
    assert response.data["title"] == "Internal Server Error"
    assert response.data["detail"] == "Internal Server Error"
    assert "sensitive" not in response.data["detail"]
    assert response.data["instance"] == "/api/entities/"
    assert "timestamp" in response.data


def test_unhandled_exception_includes_exception_message_when_debug_on():
    """When DEBUG is on, the response detail includes the exception message."""
    request = RequestFactory().get("/api/x/")
    with override_settings(DEBUG=True):
        response = custom_exception_handler(ValueError("debug hint"), {"request": request})
    assert response.status_code == 500
    assert response.data["detail"] == "debug hint"


def test_unhandled_exception_without_request_omits_instance():
    """Without a request in context, the payload omits the instance field."""
    with override_settings(DEBUG=False):
        response = custom_exception_handler(RuntimeError("x"), {})
    assert response.status_code == 500
    assert "instance" not in response.data
