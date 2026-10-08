"""Celery tasks for sending emails asynchronously."""

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail


@shared_task
def send_email_task(
    subject: str, body: str, recipient: str, from_email: str | None, mimetype: str = "text/html"
) -> None:
    """Send a single email. Uses html_message when mimetype is text/html. Skips if email is not configured."""
    from_email = from_email or getattr(settings, "DEFAULT_FROM_EMAIL", None)
    if not from_email or not from_email.strip():
        return
    is_html = mimetype != "text/plain"
    send_mail(
        subject=subject,
        message="" if is_html else body,
        html_message=body if is_html else None,
        from_email=from_email,
        recipient_list=[recipient],
        fail_silently=False,
    )
