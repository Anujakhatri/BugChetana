from django.db import models
from accounts.models import User


class Notification(models.Model):
    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    message = models.TextField()
    related_bug = models.ForeignKey(
        'bugs.Bug',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications',
    )
    related_project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications',
    )
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']

    def __str__(self):
        return f"Notification for {self.recipient.email}: {self.message[:50]}"
