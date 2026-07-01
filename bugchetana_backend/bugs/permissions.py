from rest_framework.permissions import BasePermission
from projects.models import ProjectMember

def is_project_release_manager(user, project):
    return project.release_manager == user

def is_project_member(user, project):
    return ProjectMember.objects.filter(user=user, project=project).exists()

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

class IsBugOwnerOrReleaseManager(BasePermission):
    """
    DELETE        -> Release Manager of the bug's own project only.
    PATCH/PUT     -> assigned developer (full), QA (assigned_to field only,
                      enforced in view), or Release Manager of own project (full).
    GET           -> handled by IsProjectMember separately.
    """
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False

        role = get_role(request.user)
        is_own_projects_rm = (
                role == 'Release Manager' and obj.project.release_manager == request.user
        )

        if request.method == 'DELETE':
            return is_own_projects_rm

        if request.method in ('PATCH', 'PUT'):
            is_assigned_dev = request.user == obj.assigned_to
            is_qa = role == 'QA'
            return is_assigned_dev or is_qa or is_own_projects_rm

        return True