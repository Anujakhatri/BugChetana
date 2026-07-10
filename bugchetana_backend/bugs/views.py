from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Count
from django.utils import timezone
from django.contrib.auth import get_user_model

from notifications.services import create_notification
from accounts.permissions import get_role, IsReleaseManager

from .models import Bug, BugComment, BugHistory, Release, ReleaseBug, BugList, BugListItem, QAResult
from .serializers import (
    BugSerializer, BugCreateSerializer, BugCommentSerializer, BugHistorySerializer,
    ReleaseSerializer, QAResultSerializer, BugAssignSerializer, BugResubmitSerializer,
    BugListSerializer, QAResultHistorySerializer, DeveloperBugHistorySerializer,
    BugListItemAddSerializer, BugListItemSerializer,
)
from .access import visible_bugs_for
from .permissions import (
    IsBugProjectMember,
    IsBugOwnerOrReleaseManager,
    CanCreateBug,
    HasProjectAccess,
    CanSubmitQAResult,
    CanManageRelease,
    CanAddBugToRelease,
    HasBugAccess,
    is_project_release_manager,
)


import logging
from ai_integration.ml_service import predict_severity
logger = logging.getLogger(__name__)

User = get_user_model()

# ─── Bug Views ───────────────────────────────────────────────
class BugListCreateView(generics.ListCreateAPIView):
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return BugCreateSerializer
        return BugSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), CanCreateBug()]
        return [IsAuthenticated(), HasProjectAccess()]

    def get_queryset(self):
        return visible_bugs_for(
            self.request.user,
            project_id=self.kwargs.get('project_id'),
        )

    def perform_create(self, serializer):
        title = serializer.validated_data.get('title', '')
        description = serializer.validated_data.get('description', '')

        try:
            predicted = predict_severity(title, description)
            ai_status = True
        except Exception as e:
            # ml prediction is secondary feature ho yesle garda bug creation fail hunu vayena
            logger.warning(f"Severity prediction failed, falling back to 'medium': {e}")
            predicted = "medium"
            ai_status = False

        serializer.save(
            created_by=self.request.user,
            project_id=self.kwargs['project_id'],
            predicted_severity=predicted,
            ai_status=ai_status,
        )


class BugDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = BugSerializer
    permission_classes = (IsAuthenticated, IsBugProjectMember, IsBugOwnerOrReleaseManager)
    queryset = Bug.objects.all()

    DEVELOPER_ALLOWED_FIELDS = {'status', 'description', 'title', 'notes'}
    QA_ALLOWED_FIELDS = {'assigned_to'}
    DEVELOPER_BLOCKED_STATUSES = {'closed'}

    def perform_update(self, serializer):
        user = self.request.user
        bug = self.get_object()
        role = user.role.name if user.role else None
        is_own_project_rm = (
            role == 'Release Manager'
            and is_project_release_manager(user, bug.project)
        )
        submitted_fields = set(self.request.data.keys())

        if not is_own_project_rm:
            if role == 'QA':
                if not submitted_fields.issubset(self.QA_ALLOWED_FIELDS):
                    raise PermissionDenied(
                        "QA can only update assigned_to here. Use the QA result endpoint for pass/fail."
                    )
            elif role == 'Developer' and (
                user == bug.assigned_to or user == bug.created_by
            ):
                if not submitted_fields.issubset(self.DEVELOPER_ALLOWED_FIELDS):
                    raise PermissionDenied(
                        f"Developers can only update {', '.join(self.DEVELOPER_ALLOWED_FIELDS)} here."
                    )

                new_status = self.request.data.get('status')
                if new_status in self.DEVELOPER_BLOCKED_STATUSES:
                    raise PermissionDenied(
                        "Developers cannot set status to 'closed' directly. "
                        "This is set automatically when QA passes the bug."
                    )
                # If developer is marking the bug as resolved, require a comment
                if new_status == 'resolved':
                    notes = (self.request.data.get('notes') or '').strip()
                    if not notes:
                        raise ValidationError({'notes': 'A comment is required when resolving a bug.'})

        old_status = bug.status
        serializer.instance._changed_by = self.request.user
        serializer.save()

        # If developer marked bug as resolved, record comment, history and notify QA engineers
        new_status = serializer.instance.status
        if old_status != 'resolved' and new_status == 'resolved' and role == 'Developer':
            # create a BugComment with the provided notes for audit
            notes = (self.request.data.get('notes') or '').strip()
            if notes:
                BugComment.objects.create(bug=serializer.instance, user=self.request.user, comment_text=notes)

            # record history
            BugHistory.objects.create(
                bug=serializer.instance,
                changed_by=self.request.user,
                old_status=old_status,
                new_status=new_status,
            )

            qa_members = bug.project.members.filter(user__role__name='QA')
            for member in qa_members:
                create_notification(
                    recipient=member.user,
                    message=(
                        f'Developer {self.request.user.name} marked Bug "{bug.title}" (#{bug.id}) as Resolved. '
                        f'Comment: {notes}'
                    ),
                    related_bug=bug,
                    related_project=bug.project,
                )


# ─── Comment Views ───────────────────────────────────────────
class BugCommentListCreateView(generics.ListCreateAPIView):
    serializer_class = BugCommentSerializer
    permission_classes = (IsAuthenticated, HasBugAccess)

    def get_queryset(self):
        return BugComment.objects.filter(bug_id=self.kwargs['bug_id'])

    def perform_create(self, serializer):
        serializer.save(
            user=self.request.user,
            bug_id=self.kwargs['bug_id'],
        )


# ─── Bug History View ─────────────────────────────────────────
class BugHistoryListView(generics.ListAPIView):
    serializer_class = BugHistorySerializer
    permission_classes = (IsAuthenticated, HasBugAccess)

    def get_queryset(self):
        return BugHistory.objects.filter(
            bug_id=self.kwargs['bug_id'],
        ).order_by('-changed_at')


# ─── QA Result Views ──────────────────────────────────────────
class QAResultCreateView(generics.CreateAPIView):
    serializer_class = QAResultSerializer
    permission_classes = (IsAuthenticated, CanSubmitQAResult)

    def perform_create(self, serializer):
        bug = get_object_or_404(Bug, id=self.kwargs['bug_id'])

        if bug.status not in ('resolved', 'resubmitted'):
            raise ValidationError("Only resolved or resubmitted bugs can be QA tested.")
        prev_status = bug.status

        qa_result = serializer.save(
            qa=self.request.user,
            bug_id=self.kwargs['bug_id'],
        )

        now = timezone.now()
        bug.reviewed_by = self.request.user
        bug.reviewed_at = now

        if qa_result.result == 'pass':
            bug.status = 'closed'
            bug.verified_by = self.request.user
            bug.qa_comment = None
            rm = bug.project.release_manager
            if rm:
                create_notification(
                    recipient=rm,
                    message=f'"{bug.title}" was approved by QA — ready to release',
                    related_bug=bug,
                    related_project=bug.project,
                )
        elif qa_result.result == 'fail':
            bug.status = 'failed'
            bug.qa_comment = qa_result.notes
            bug.verified_by = None
            if bug.assigned_to:
                create_notification(
                    recipient=bug.assigned_to,
                    message=(
                        f'Bug "#{bug.id}: {bug.title}" failed QA review. '
                        f'Comment: {qa_result.notes}'
                    ),
                    related_bug=bug,
                )
        elif qa_result.result == 'reassign':
            # QA requested reassignment — mark resubmitted and notify all developers on the project
            bug.status = 'resubmitted'
            bug.qa_comment = qa_result.notes
            bug.verified_by = None
            from projects.models import Project
            dev_members = bug.project.members.filter(user__role__name='Developer')
            for member in dev_members:
                create_notification(
                    recipient=member.user,
                    message=(
                        f'QA {self.request.user.name} reassigned Bug "{bug.title}" (#{bug.id}). '
                        f'Comment: {qa_result.notes}'
                    ),
                    related_bug=bug,
                    related_project=bug.project,
                )

        # record history if status changed
        bug._changed_by = self.request.user
        if prev_status != bug.status:
            BugHistory.objects.create(
                bug=bug,
                changed_by=self.request.user,
                old_status=prev_status,
                new_status=bug.status,
            )
        bug.save()


class BugAssignView(APIView):
    permission_classes = (IsAuthenticated, CanSubmitQAResult)

    def patch(self, request, pk):
        bug = get_object_or_404(Bug.objects.select_related('project'), pk=pk)
        serializer = BugAssignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        developer = User.objects.get(pk=serializer.validated_data['assigned_to'])
        notes = (request.data.get('notes') or '').strip()
        record_reassign = request.data.get('record_reassign', False)

        if record_reassign and not notes:
            return Response(
                {'notes': ['A comment is required when reassigning a bug.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        previous_assignee = bug.assigned_to_id
        bug.assigned_to = developer
        bug._changed_by = request.user
        bug.save(update_fields=['assigned_to'])

        create_notification(
            recipient=developer,
            message=f'Bug "#{bug.id}: {bug.title}" has been assigned to you.',
            related_bug=bug,
        )

        if record_reassign:
            QAResult.objects.create(
                bug=bug,
                qa=request.user,
                result='reassign',
                notes=notes,
            )

        return Response(BugSerializer(bug).data)


class BugResubmitView(APIView):
    permission_classes = (IsAuthenticated, HasBugAccess)

    def post(self, request, pk):
        bug = get_object_or_404(Bug, pk=pk)
        role = request.user.role.name if request.user.role else None

        if role != 'Developer' or request.user not in (bug.assigned_to, bug.created_by):
            raise PermissionDenied('Only the assigned developer can resubmit this bug.')
        if bug.status != 'failed':
            raise ValidationError('Only failed bugs can be resubmitted.')

        serializer = BugResubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if 'title' in serializer.validated_data:
            bug.title = serializer.validated_data['title']
        if 'description' in serializer.validated_data:
            bug.description = serializer.validated_data['description']

        bug.status = 'resubmitted'
        bug.qa_comment = None
        bug._changed_by = request.user
        bug.save()

        return Response(BugSerializer(bug).data, status=status.HTTP_200_OK)


# ─── Release Views ────────────────────────────────────────────
class ReleaseListCreateView(generics.ListCreateAPIView):
    serializer_class = ReleaseSerializer
    permission_classes = (IsAuthenticated, CanManageRelease)

    def get_queryset(self):
        return Release.objects.filter(project_id=self.kwargs['project_id'])

    def perform_create(self, serializer):
        serializer.save(
            created_by=self.request.user,
            project_id=self.kwargs['project_id'],
        )


class AddBugToReleaseView(APIView):
    permission_classes = (IsAuthenticated, CanAddBugToRelease)

    def post(self, request, release_id):
        release = get_object_or_404(Release, id=release_id)

        bug_id = request.data.get('bug_id')
        bug = get_object_or_404(Bug, id=bug_id)

        if bug.project_id != release.project_id:
            return Response(
                {"error": "Bug does not belong to the same project as this release"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if ReleaseBug.objects.filter(release=release, bug=bug).exists():
            return Response(
                {"error": "Bug already in this release"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ReleaseBug.objects.create(release=release, bug=bug)
        return Response(
            {"message": f"Bug#{bug.id} added to Release v{release.version}"},
            status=status.HTTP_201_CREATED,
        )


# ─── Dashboard Views ──────────────────────────────────────────
class DashboardSummaryView(APIView):
    permission_classes = (IsAuthenticated, HasProjectAccess)

    def get(self, request, project_id):
        bugs = visible_bugs_for(request.user, project_id=project_id)
        severity_breakdown = bugs.values('severity').annotate(count=Count('severity'))
        status_breakdown_rows = bugs.values('status').annotate(count=Count('status'))
        status_breakdown = {row['status']: row['count'] for row in status_breakdown_rows}

        return Response({
            "total_bugs": bugs.count(),
            "open_bugs": bugs.filter(status='open').count(),
            "resolved_bugs": bugs.filter(status='resolved').count(),
            "failed_bugs": bugs.filter(status='failed').count(),
            "severity_breakdown": {item['severity']: item['count'] for item in severity_breakdown},
            # New: dynamic status breakdown dict (e.g. {"open": 3, "in_progress": 1, ...}).
            # QaDashboardPage / DeveloperDashboardPage read this; RmDashboardPage uses
            # severity_breakdown and remains unaffected.
            "status_breakdown": status_breakdown,
        })


RECENT_ACTIVITY_LIMIT = 15


def _recent_activity_for_bug_qs(bug_qs, *, limit=RECENT_ACTIVITY_LIMIT):
    """Merge QAResult and BugHistory rows touching any bug in *bug_qs*.

    Returns at most *limit* items, newest first, with shape:
        {id, type, bug_id, project_id, timestamp}
    where type is 'qa_result' or 'bug_history'.
    """
    visible_bug_ids = bug_qs.values_list('id', flat=True)

    qa = (
        QAResult.objects
        .filter(bug_id__in=visible_bug_ids)
        .values('id', 'bug_id', 'bug__project_id', 'tested_at')
        .order_by('-tested_at')[:limit]
    )
    history = (
        BugHistory.objects
        .filter(bug_id__in=visible_bug_ids)
        .values('id', 'bug_id', 'bug__project_id', 'changed_at')
        .order_by('-changed_at')[:limit]
    )

    items = []
    for row in qa:
        items.append({
            'id': row['id'],
            'type': 'qa_result',
            'bug_id': row['bug_id'],
            'project_id': row['bug__project_id'],
            'timestamp': row['tested_at'],
        })
    for row in history:
        items.append({
            'id': row['id'],
            'type': 'bug_history',
            'bug_id': row['bug_id'],
            'project_id': row['bug__project_id'],
            'timestamp': row['changed_at'],
        })

    items.sort(key=lambda r: r['timestamp'], reverse=True)
    return items[:limit]


class QaDashboardSummaryView(APIView):
    """GET /api/dashboard/qa/  — summary for the logged-in QA user."""
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        user = request.user
        from projects.models import ProjectMember

        # Scope: bugs in projects the QA is a member of (per visible_bugs_for for QA).
        visible = visible_bugs_for(user)
        # Build a {bug_id: project_id} lookup so we can return project_id in activity items
        # without an extra join per row.
        project_id_by_bug = dict(
            visible.values_list('id', 'project_id')
        )

        pending_review_count = visible.filter(
            status='resolved', verified_by__isnull=True,
        ).count()

        failed_recheck_count = visible.filter(
            status__in=('failed', 'resubmitted'),
        ).count()

        # active_bug_lists_count = BugLists in this QA's member projects
        member_project_ids = ProjectMember.objects.filter(user=user).values_list(
            'project_id', flat=True
        )
        active_bug_lists_count = BugList.objects.filter(
            project_id__in=member_project_ids,
        ).count()

        recent_activity = _recent_activity_for_bug_qs(visible)

        return Response({
            'pending_review_count': pending_review_count,
            'failed_recheck_count': failed_recheck_count,
            'active_bug_lists_count': active_bug_lists_count,
            'recent_activity': recent_activity,
        })


class DeveloperDashboardSummaryView(APIView):
    """GET /api/dashboard/developer/  — summary for the logged-in Developer."""
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        user = request.user

        # For a developer, "their bugs" = bugs assigned_to=user.
        # visible_bugs_for(Developer) already returns exactly that (no project scope).
        assigned = visible_bugs_for(user)

        # Group by status. We use a single annotated query so the dict reflects
        # exactly the rows in *assigned* (no off-by-one from chaining filters).
        status_rows = (
            assigned.values('status')
            .annotate(count=Count('status'))
        )
        assigned_by_status = {row['status']: row['count'] for row in status_rows}
        # Ensure all six known statuses appear in the response (default 0).
        for s in ('open', 'in_progress', 'resolved', 'failed', 'resubmitted', 'closed'):
            assigned_by_status.setdefault(s, 0)

        needs_attention_count = assigned.filter(
            status__in=('failed', 'resubmitted'),
        ).count()

        recent_activity = _recent_activity_for_bug_qs(assigned)

        return Response({
            'assigned_by_status': assigned_by_status,
            'needs_attention_count': needs_attention_count,
            'recent_activity': recent_activity,
        })


class DeveloperSubmittedBugsView(generics.ListAPIView):
    """Bugs created by the authenticated developer (Bug History tab)."""
    serializer_class = DeveloperBugHistorySerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        user = self.request.user
        if get_role(user) != 'Developer':
            return Bug.objects.none()

        qs = Bug.objects.filter(created_by=user).select_related('project')
        project_id = self.request.query_params.get('project_id')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs.order_by('-created_at')


class QAResultHistoryView(generics.ListAPIView):
    """QA review decisions for the authenticated QA user."""
    serializer_class = QAResultHistorySerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        user = self.request.user
        if get_role(user) != 'QA':
            return QAResult.objects.none()

        qs = QAResult.objects.filter(qa=user).select_related(
            'bug', 'bug__assigned_to', 'bug__project',
        )
        project_id = self.request.query_params.get('project_id')
        if project_id:
            qs = qs.filter(bug__project_id=project_id)
        return qs.order_by('-tested_at')


class BugListCreateViewForProject(generics.ListCreateAPIView):
    serializer_class = BugListSerializer
    permission_classes = (IsAuthenticated, HasProjectAccess)

    def get_queryset(self):
        return BugList.objects.filter(
            project_id=self.kwargs['project_id'],
        ).prefetch_related('items__bug')

    def get_permissions(self):
        if self.request.method == 'POST':
            from .permissions import CanCreateBugList
            return [IsAuthenticated(), CanCreateBugList()]
        return [IsAuthenticated(), HasProjectAccess()]

    def perform_create(self, serializer):
        project_id = self.kwargs['project_id']
        pending_bugs = Bug.objects.filter(
            project_id=project_id,
            status__in=('resolved', 'resubmitted'),
        )
        bug_list = serializer.save(
            project_id=project_id,
            created_by=self.request.user,
        )
        for bug in pending_bugs:
            BugListItem.objects.get_or_create(bug_list=bug_list, bug=bug)

        # Notify project developers about the new bug list
        from projects.models import Project
        project = Project.objects.get(id=project_id)
        dev_members = project.members.filter(user__role__name='Developer')
        for member in dev_members:
            create_notification(
                recipient=member.user,
                message=f'A new bug list "{bug_list.name}" was created for project "{project.name}".',
                related_project=project,
            )


class BugListItemAddView(APIView):
    """
    POST /api/projects/<project_id>/bug-lists/<bug_list_id>/items/

    Bulk-add one or more existing Bug IDs to a BugList as BugListItems.
    Accepts either {bug_id: <int>} for a single add, or
    {bug_ids: [<int>, ...]} for a bulk add. Duplicates (already present
    on the list, per the unique_together constraint) are skipped
    silently. Bugs must belong to the same project as the BugList.
    """
    permission_classes = (IsAuthenticated, CanCreateBugList)

    def post(self, request, project_id, bug_list_id):
        bug_list = get_object_or_404(
            BugList.objects.select_related('project'),
            pk=bug_list_id,
            project_id=project_id,
        )

        serializer = BugListItemAddSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        requested_ids = serializer.to_ids(serializer.validated_data)

        # Filter to bugs in the same project; reject (or skip) cross-project ids.
        valid_bugs = Bug.objects.filter(
            id__in=requested_ids,
            project_id=bug_list.project_id,
        )
        valid_ids = set(valid_bugs.values_list('id', flat=True))
        missing_ids = [i for i in requested_ids if i not in valid_ids]
        if missing_ids:
            return Response(
                {'bug_ids': [f'Bugs not found in this project: {missing_ids}']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Skip duplicates against existing BugListItems.
        already_present = set(
            BugListItem.objects.filter(
                bug_list=bug_list, bug_id__in=valid_ids,
            ).values_list('bug_id', flat=True)
        )
        to_create_ids = [i for i in valid_ids if i not in already_present]

        created_items = []
        for bug_id in to_create_ids:
            item = BugListItem.objects.create(bug_list=bug_list, bug_id=bug_id)
            created_items.append(item)

        # Return the full updated list of bug_ids, plus counts.
        return Response(
            {
                'bug_list_id': bug_list.id,
                'requested_count': len(requested_ids),
                'added_count': len(created_items),
                'skipped_duplicates': sorted(already_present),
                'bug_ids': list(
                    BugListItem.objects.filter(bug_list=bug_list)
                    .values_list('bug_id', flat=True)
                ),
                'items': BugListItemSerializer(created_items, many=True).data,
            },
            status=status.HTTP_201_CREATED,
        )


class BugVerifyView(APIView):
    """
    PATCH /api/bugs/<pk>/verify/

    QA marks a resolved Bug as verified. Sets verified_by = request.user,
    writes a BugHistory row (old_status == new_status == 'resolved'),
    and notifies the assigned developer. Does NOT change bug.status and
    does NOT create a QAResult row — verification is a separate audit
    step from QA pass/fail.
    """
    permission_classes = (IsAuthenticated, CanSubmitQAResult)

    def patch(self, request, pk):
        bug = get_object_or_404(
            Bug.objects.select_related('project'),
            pk=pk,
        )

        if bug.status != 'resolved':
            raise ValidationError(
                {'status': f'Only resolved bugs can be verified (current: {bug.status}).'}
            )

        bug.verified_by = request.user
        bug._changed_by = request.user
        bug.save(update_fields=['verified_by'])

        BugHistory.objects.create(
            bug=bug,
            changed_by=request.user,
            old_status=bug.status,
            new_status=bug.status,  # informational; status does not change
        )

        if bug.assigned_to:
            create_notification(
                recipient=bug.assigned_to,
                message=(
                    f'Your fix on Bug "{bug.title}" (#{bug.id}) was verified by QA '
                    f'({request.user.name}).'
                ),
                related_bug=bug,
                related_project=bug.project,
            )

        return Response(BugSerializer(bug).data, status=status.HTTP_200_OK)


class ReleaseManagerHistoryView(APIView):
    """
    Aggregate history for Release Manager dashboards.
    Bugs Reassigned = QA fail results across managed projects (see product note in frontend).
    """
    permission_classes = (IsAuthenticated, IsReleaseManager)

    def get(self, request):
        from projects.models import Project

        projects = Project.objects.filter(release_manager=request.user)
        project_ids = list(projects.values_list('id', flat=True))

        total_projects_created = projects.count()
        total_projects_released = Release.objects.filter(
            project_id__in=project_ids,
        ).values('project_id').distinct().count()

        # QA fail events treated as reassignment/rejection back to developer
        fail_results = QAResult.objects.filter(
            bug__project_id__in=project_ids,
            result='fail',
        ).select_related('bug', 'bug__project')

        total_bugs_reassigned = fail_results.count()

        activity = []

        for project in projects.order_by('-created_at'):
            activity.append({
                'project': project.name,
                'action': 'Created',
                'bug_title': None,
                'date': project.created_at,
            })

        for release in Release.objects.filter(
            project_id__in=project_ids,
        ).select_related('project').order_by('-released_at'):
            activity.append({
                'project': release.project.name,
                'action': 'Released',
                'bug_title': release.version,
                'date': release.released_at,
            })

        for qa_result in fail_results.order_by('-tested_at'):
            activity.append({
                'project': qa_result.bug.project.name,
                'action': 'Reassigned',
                'bug_title': qa_result.bug.title,
                'date': qa_result.tested_at,
            })

        activity.sort(key=lambda item: item['date'], reverse=True)

        return Response({
            'total_projects_created': total_projects_created,
            'total_projects_released': total_projects_released,
            'total_bugs_reassigned': total_bugs_reassigned,
            'activity': activity,
        })
