from django.apps import AppConfig


class BugConfig(AppConfig):
    name = "bugs"

    def ready(self):
        import bugs.signals
