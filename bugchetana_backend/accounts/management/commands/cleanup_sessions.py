from django.core.management.base import BaseCommand
from django.utils import timezone
from accounts.models import UserSession

class Command(BaseCommand):
    help = "Delete expired UserSession records"

    def handle(self, *args, **kwargs):
        deleted, _ = UserSession.objects.filter(
            expires_at__lt=timezone.now()
        ).delete()
        self.stdout.write(f"Deleted {deleted} expired sessions")