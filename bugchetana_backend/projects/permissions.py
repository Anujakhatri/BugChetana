from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsReleaseManager(BasePermission):
    message = "Only release managers can perform this action."

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return request.user and request.user.is_authenticated
        
        return (
            request.user and request.user.is_authenticated and
            request.user.role is not None and
            request.user.role.name == 'release_manager'
        )


class IsProjectMember(BasePermission):
    message = "You do not have permission to perform this action."

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return (
                obj.release_manager == request.user or
                obj.members.filter(user=request.user).exists()
            )
        
        return obj.release_manager == request.user