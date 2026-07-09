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

        return Response({
            "total_bugs": bugs.count(),
            "open_bugs": bugs.filter(status='open').count(),
            "resolved_bugs": bugs.filter(status='resolved').count(),
            "failed_bugs": bugs.filter(status='failed').count(),
            "severity_breakdown": {item['severity']: item['count'] for item in severity_breakdown},
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
