from notifications.models import Notification


def create_notification(*, recipient, message, related_bug=None, related_project=None):
    return Notification.objects.create(
        recipient=recipient,
        message=message,
        related_bug=related_bug,
        related_project=related_project,
    )
