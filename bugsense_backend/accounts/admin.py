from django.utils import timezone
from django.contrib import admin
from accounts.models import UserSession


# Register your models here.
@admin.register(UserSession)
class UserSessionAdmin(admin.ModelAdmin):
    list_display = ('user', 'created_at', 'expires_at', 'is_expired')
    list_filter = ('expires_at',)
    search_fields = ('user', 'email')
    readonly_fields = ('refresh_token_hash', 'created_at')

    @admin.display(boolean=True, description='Expired?')
    def is_expired(self, obj):
        return obj.expires_at < timezone.now()