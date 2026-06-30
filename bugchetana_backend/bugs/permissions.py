from rest_framework.permissions import BasePermission
from projects.models import ProjectMember


def get_role(user):
    return user.role.name if user.role else None


class IsDeveloper(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and get_role(request.user) == 'Developer'


class IsQA(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and get_role(request.user) == 'QA'


class IsReleaseManager(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and get_role(request.user) == 'Release Manager'


class IsQAOrDeveloper(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and get_role(request.user) in ['QA', 'Developer']


class IsReleaseManagerOrQA(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and get_role(request.user) in ['Release Manager', 'QA']


class IsAssignedDeveloper(BasePermission):
    def has_object_permission(self, request, view, obj):
        return request.user.is_authenticated and request.user == obj.assigned_to


class IsProjectMember(BasePermission):
    """Bug ko project ma member cha ki chaina check"""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        project = getattr(obj, 'project', None)
        if not project:
            return False
        return ProjectMember.objects.filter(project=project, user=request.user).exists()