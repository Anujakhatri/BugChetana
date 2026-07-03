from rest_framework.permissions import BasePermission


class IsDevOrQA(BasePermission):
    message = "Only Developers and QA can access AI roast/suggestion features."

    def has_permission(self, request, view):
        role = request.user.role.name if request.user.role else None
        return role in ('Developer', 'QA')