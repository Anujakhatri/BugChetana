from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    message = "Only admins can perform this action."

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            request.user.is_staff
        )

class IsAdminOrReleaseManager(BasePermission):
    message = "Only admins or release managers can perform this action."

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        is_admin = request.user.is_staff
        is_rm = request.user.role and request.user.role.name == 'release_manager'
        
        return is_admin or is_rm