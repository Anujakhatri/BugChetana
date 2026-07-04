from rest_framework.permissions import BasePermission, SAFE_METHODS


def get_role(user):
    return user.role.name if user.role else None

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
        return (
            request.user and request.user.is_authenticated and
            (request.user.is_staff or get_role(request.user) == 'Release Manager')
        )

class IsDeveloper(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and get_role(request.user) == 'Developer'

class IsQA(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and get_role(request.user) == 'QA'

class IsReleaseManager(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return (request.user and request.user.is_authenticated and
                get_role(request.user) == 'Release Manager')

class IsQAOrDeveloper(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and get_role(request.user) in ['QA', 'Developer']

class IsReleaseManagerOrQA(BasePermission):
    def has_permission(self, request, view):
        return (request.user.is_authenticated and
                get_role(request.user) in ['Release Manager', 'QA'])