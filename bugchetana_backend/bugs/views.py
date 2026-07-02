from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Count

from .models import Bug, BugComment, BugHistory, Release, ReleaseBug
from .serializers import (
    BugSerializer, BugCreateSerializer, BugCommentSerializer, BugHistorySerializer,
    ReleaseSerializer, QAResultSerializer,
)
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
        user = self.request.user
        role = user.role.name if user.role else None
        project_id = self.kwargs.get('project_id')

        qs = Bug.objects.filter(project_id=project_id)

        if role == 'Developer':
            return qs.filter(assigned_to=user)
        if role in ('QA', 'Release Manager'):
            return qs

        return qs.none()

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
            severity=predicted,
            ai_status=ai_status,
        )


class BugDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = BugSerializer
    permission_classes = (IsAuthenticated, IsBugProjectMember, IsBugOwnerOrReleaseManager)
    queryset = Bug.objects.all()

    DEVELOPER_ALLOWED_FIELDS = {'status', 'description'}
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

        serializer.instance._changed_by = self.request.user
        serializer.save()


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

        if bug.status != 'resolved':
            raise ValidationError("Only resolved bugs can be QA tested.")

        qa_result = serializer.save(
            qa=self.request.user,
            bug_id=self.kwargs['bug_id'],
        )

        if qa_result.result == 'pass':
            bug.status = 'closed'
            bug.verified_by = self.request.user
        elif qa_result.result == 'fail':
            bug.status = 'open'

        bug._changed_by = self.request.user
        bug.save()


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
        bugs = Bug.objects.filter(project_id=project_id)
        role = request.user.role.name if request.user.role else None
        if role == 'Developer':
            bugs = bugs.filter(assigned_to=request.user)

        severity_breakdown = bugs.values('severity').annotate(count=Count('severity'))

        return Response({
            "total_bugs": bugs.count(),
            "open_bugs": bugs.filter(status='open').count(),
            "resolved_bugs": bugs.filter(status='resolved').count(),
            "severity_breakdown": {item['severity']: item['count'] for item in severity_breakdown},
        })
