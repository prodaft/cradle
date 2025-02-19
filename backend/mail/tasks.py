from django.core.mail import send_mail
from celery import shared_task


@shared_task
def send_email_task(
    subject: str, body: str, recipient: str, from_email: str, mimetype: str
):
    send_mail(
        subject=subject,
        message=body if mimetype == "text/plain" else "",
        html_message=body if mimetype == "text/html" else None,
        from_email=from_email,
        recipient_list=[recipient],
        fail_silently=False,
    )
