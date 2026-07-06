from rest_framework.permissions import BasePermission, SAFE_METHODS
from accounts.permissions import get_role
from projects.permissions import(
    is_project_release_manager,
    is_project_member,
    can_view_project,
)
from .access import can_view_bug

class IsAssignedDeveloper(BasePermission):
    def has_object_permission(self, request, view, obj):
        return request.user.is_authenticated and request.user == obj.assigned_to

class IsBugProjectMember(BasePermission):
    """Enforces project-scoped access per role (membership or release_manager_id)."""
    message = "You do not have permission to access this project."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        from bugs.models import Bug

        if isinstance(obj, Bug) and request.method in SAFE_METHODS:
            return can_view_bug(request.user, obj)

        project = getattr(obj, 'project', None)
        if not project:
            return False
        return can_view_project(request.user, project)

class IsBugOwnerOrReleaseManager(BasePermission):
    """
    DELETE  -> Release Manager of the bug's own project only.
    PATCH   -> assigned developer (status/description only, enforced in view),
               QA (assigned_to only, enforced in view),
               or Release Manager of own project (full).
    GET     -> handled by IsProjectMember separately.
    """
    message = "You do not have permission to modify this bug."

    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False

        role = get_role(request.user)
        is_own_projects_rm = (
            role == 'Release Manager'
            and is_project_release_manager(request.user, obj.project)
        )

        if request.method == 'DELETE':
            return is_own_projects_rm

        if request.method in ('PATCH', 'PUT'):
            is_assigned_dev = (
                role == 'Developer'
                and (
                    request.user == obj.assigned_to
                    or request.user == obj.created_by
                )
            )
            is_qa = role == 'QA' and is_project_member(request.user, obj.project)
            return is_assigned_dev or is_qa or is_own_projects_rm
        return True


class HasProjectAccess(BasePermission):
    """Role-split project access via project_id kwarg on the view."""
    message = "You do not have permission to access this project."

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        project_id = view.kwargs.get('project_id')
        if not project_id:
            return False
        from projects.models import Project
        try:
            project = Project.objects.get(pk=project_id)
        except Project.DoesNotExist:
            return False
        return can_view_project(request.user, project)

class HasBugAccess(BasePermission):
    message = "You do not have permission to access this bug."
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        bug_id = view.kwargs.get('bug_id') or view.kwargs.get('pk')
        if not bug_id:
            return False
        from bugs.models import Bug
        try:
            bug = Bug.objects.select_related('project').get(pk=bug_id)
        except Bug.DoesNotExist:
            return False
        return can_view_bug(request.user, bug)

class CanCreateBug(HasProjectAccess):
    """Only developers who are project members can create bugs."""
    message = "You do not have permission to create bugs in this project."

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        return get_role(request.user) in ['Developer']


class CanSubmitQAResult(BasePermission):
    """QA members only — project access via project_members, not release_manager_id."""
    message = "Only QA members of this project can submit QA results."

    def has_permission(self, request, view):
        if not request.user.is_authenticated or get_role(request.user) != 'QA':
            return False
        bug_id = view.kwargs.get('bug_id') or view.kwargs.get('pk')
        if not bug_id:
            return False
        from bugs.models import Bug
        try:
            bug = Bug.objects.select_related('project').get(pk=bug_id)
        except Bug.DoesNotExist:
            return False
        return is_project_member(request.user, bug.project)


class CanManageRelease(BasePermission):
    """Release Manager of the project identified by project_id kwarg."""
    message = "Only the release manager of this project can manage releases."

    def has_permission(self, request, view):
        if not request.user.is_authenticated or get_role(request.user) != 'Release Manager':
            return False
        project_id = view.kwargs.get('project_id')
        if not project_id:
            return False
        from projects.models import Project
        try:
            project = Project.objects.get(pk=project_id)
        except Project.DoesNotExist:
            return False
        return is_project_release_manager(request.user, project)


class CanAddBugToRelease(BasePermission):
    """Release Manager of the release's project (release_id kwarg)."""
    message = "Only the release manager of this project can add bugs to a release."

    def has_permission(self, request, view):
        if (not request.user.is_authenticated or
                get_role(request.user) != 'Release Manager'):
            return False
        release_id = view.kwargs.get('release_id')
        if not release_id:
            return False
        from bugs.models import Release
        try:
            release = Release.objects.select_related('project').get(pk=release_id)
        except Release.DoesNotExist:
            return False
        return is_project_release_manager(request.user, release.project)