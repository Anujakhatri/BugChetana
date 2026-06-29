from rest_framework.permissions import BasePermission


class IsReleaseManager(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            request.user.role and
            request.user.role.name == 'Release Manager'
        )


class IsProjectMember(BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.members.filter(user=request.user).exists()