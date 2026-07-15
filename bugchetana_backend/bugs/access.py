"""
Shared bug visibility rules for list, detail, dashboard, comments, history, and AI access.

Developers may see a bug only when assigned_to == user (project membership is enforced
separately via HasProjectAccess / can_view_project where applicable).
"""
from accounts.permissions import get_role
from projects.permissions import can_view_project, is_project_release_manager
from django.db import models
from django.db.models import Q


def visible_bugs_for(user, project=None, project_id=None):
    """
    Return the Bug queryset visible to *user* for read/list/dashboard purposes.

    - Developer: assigned_to=user (within optional project scope)
    - QA: all bugs in member projects (or the scoped project if accessible)
    - Release Manager: all bugs in managed projects (or the scoped project if accessible)
    - Others: empty queryset
    """
    from bugs.models import Bug

    qs = Bug.objects.all()
    if project is not None:
        qs = qs.filter(project=project)
    elif project_id is not None:
        qs = qs.filter(project_id=project_id)

    role = get_role(user)

    if role == 'Developer':
        return qs.filter(Q(assigned_to=user) | Q(created_by=user))

    if role == 'QA':
        if project is not None:
            return qs if can_view_project(user, project) else qs.none()
        if project_id is not None:
            from projects.models import Project
            try:
                proj = Project.objects.get(pk=project_id)
            except Project.DoesNotExist:
                return qs.none()
            return qs if can_view_project(user, proj) else qs.none()
        from projects.models import ProjectMember
        member_project_ids = ProjectMember.objects.filter(user=user).values_list(
            'project_id', flat=True
        )
        return qs.filter(project_id__in=member_project_ids)

    if role == 'Release Manager':
        if project is not None:
            return qs if is_project_release_manager(user, project) else qs.none()
        if project_id is not None:
            from projects.models import Project
            try:
                proj = Project.objects.get(pk=project_id)
            except Project.DoesNotExist:
                return qs.none()
            return qs if is_project_release_manager(user, proj) else qs.none()
        return qs.filter(project__release_manager=user)

    return qs.none()


def can_view_bug(user, bug):
    """True if *bug* is in the user's visible bug queryset for that project."""
    return visible_bugs_for(user, project=bug.project).filter(pk=bug.pk).exists()
