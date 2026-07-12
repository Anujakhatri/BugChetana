from django.core.management.base import BaseCommand
from django.core.management import call_command
from accounts.models import Role


class Command(BaseCommand):
    help = 'Fresh project setup: migrate + seed roles'

    def handle(self, *args, **options):
        self.stdout.write('Running migrations...')
        call_command('migrate')

        if Role.objects.exists():
            self.stdout.write(self.style.WARNING('Roles already exist, skipping seed.'))
        else:
            self.stdout.write('Seeding roles...')
            call_command('loaddata', 'roles')

        self.stdout.write(self.style.SUCCESS('Setup complete!'))