from rest_framework.permissions import BasePermission, SAFE_METHODS
from accounts.permissions import get_role
from .models import Project

def is_project_release_manager(user, project):
    return project.release_manager_id == user.id

def is_project_member(user, project):
    return project.members.filter(user=user).exists()

def can_view_project(user, project):
    """
    Developer/QA: project_members only.
    Release Manager: release_manager_id only (not project_members).
    """
    role = get_role(user)
    if role == 'Release Manager':
        return is_project_release_manager(user, project)
    if role in ('Developer', 'QA'):
        return is_project_member(user, project)
    return False

class IsProjectMember(BasePermission):
    message = "You do not have permission to perform this action."

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return can_view_project(request.user, obj)

        role = get_role(request.user)
        return (
            role == 'Release Manager'
            and is_project_release_manager(request.user, obj)
        )
class IsOwnProjectReleaseManager(BasePermission):
    message = "Only the release manager of this project can perform this action."

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if get_role(request.user) != 'Release Manager':
            return False
        project_id = view.kwargs.get('project_id')
        if not project_id:
            return False
        try:
            project = Project.objects.get(pk=project_id)
        except Project.DoesNotExist:
            return True
        return is_project_release_manager(request.user, project)
