from django.utils import timezone
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from accounts.models import User, UserSession, Role


# Register your models here.
@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ('id','name', 'description',)
    search_fields = ('name',)

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('id','username', 'email', 'name','role','status', 'is_active')
    list_filter = ('role','status', 'is_active',)
    search_fields = ('username', 'email', 'name',)
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Role Info', {'fields': ('role','name')}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Role Info', {'fields': ('role','name')}),
    )

@admin.register(UserSession)
class UserSessionAdmin(admin.ModelAdmin):
    list_display = ('user', 'created_at', 'expires_at', 'is_expired')
    list_filter = ('expires_at',)
    search_fields = ('user', 'email')
    readonly_fields = ('refresh_token_hash', 'created_at')

    @admin.display(boolean=True, description='Expired?')
    def is_expired(self, obj):
        return obj.expires_at < timezone.now()