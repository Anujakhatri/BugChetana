from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Bug, BugComment, BugHistory, Release, ReleaseBug, QAResult
from django.db.models import Count
from .serializers import (
    BugSerializer, BugCreateSerializer, BugCommentSerializer, BugHistorySerializer,
    ReleaseSerializer, QAResultSerializer
)
from .permissions import IsDeveloper, IsQA, IsReleaseManager, IsProjectMember


# ─── Bug Views ───────────────────────────────────────────────

class BugListCreateView(generics.ListCreateAPIView):
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return BugCreateSerializer
        return BugSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), IsDeveloper(), IsProjectMember()]
        return [IsAuthenticated(), IsProjectMember()]

    def check_project_membership(self):
        project_id = self.kwargs.get('project_id')
        user = self.request.user
        from projects.models import Project
        project = get_object_or_404(Project, id=project_id)
        if not (project.release_manager == user or project.members.filter(user=user).exists()):
            self.permission_denied(self.request, message="You do not have permission to perform this action.")

    def get_queryset(self):
        self.check_project_membership()
        user = self.request.user
        role = user.role.name if user.role else None
        project_id = self.kwargs.get('project_id')

        qs = Bug.objects.filter(project_id=project_id)

        if role == 'Developer':
            return qs.filter(assigned_to=user)
        elif role == 'QA':
            return qs  # QA le sabai bugs dekhcha project bitra
        elif role == 'Release Manager':
            return qs  # RM le sabai dekhcha
        return qs.none()

    def perform_create(self, serializer):
        self.check_project_membership()
        user = self.request.user

        serializer.save(
            created_by=user,
            project_id=self.kwargs['project_id']
        )


class BugDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = BugSerializer
    permission_classes = (IsAuthenticated, IsProjectMember)
    queryset = Bug.objects.all()

    def perform_update(self, serializer):
        serializer.instance._changed_by = self.request.user
        serializer.save()


# ─── Comment Views ───────────────────────────────────────────

class BugCommentListCreateView(generics.ListCreateAPIView):
    serializer_class = BugCommentSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        return BugComment.objects.filter(bug_id=self.kwargs['bug_id'])

    def perform_create(self, serializer):
        serializer.save(
            user=self.request.user,
            bug_id=self.kwargs['bug_id']
        )


# ─── Bug History View ─────────────────────────────────────────

class BugHistoryListView(generics.ListAPIView):
    serializer_class = BugHistorySerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        return BugHistory.objects.filter(
            bug_id=self.kwargs['bug_id']
        ).order_by('-changed_at')


# ─── QA Result Views ──────────────────────────────────────────

class QAResultCreateView(generics.CreateAPIView):
    serializer_class = QAResultSerializer
    permission_classes = (IsAuthenticated, IsQA)

    def perform_create(self, serializer):
        from rest_framework.exceptions import ValidationError
        bug = get_object_or_404(Bug, id=self.kwargs['bug_id'])
        
        if bug.status != 'resolved':
            raise ValidationError("Only resolved bugs can be QA tested.")
            
        qa_result = serializer.save(
            qa=self.request.user,
            bug_id=self.kwargs['bug_id']
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
    permission_classes = (IsAuthenticated, IsReleaseManager)

    def get_queryset(self):
        return Release.objects.filter(project_id=self.kwargs['project_id'])

    def perform_create(self, serializer):
        serializer.save(
            created_by=self.request.user,
            project_id=self.kwargs['project_id']
        )


class AddBugToReleaseView(APIView):
    permission_classes = (IsAuthenticated, IsReleaseManager)

    def post(self, request, release_id):
        release = get_object_or_404(Release, id=release_id)
        bug_id = request.data.get('bug_id')
        bug = get_object_or_404(Bug, id=bug_id)

        if ReleaseBug.objects.filter(release=release, bug=bug).exists():
            return Response(
                {"error": "Bug already in this release"},
                status=status.HTTP_400_BAD_REQUEST
            )

        ReleaseBug.objects.create(release=release, bug=bug)
        return Response(
            {"message": f"Bug#{bug.id} added to Release v{release.version}"},
            status=status.HTTP_201_CREATED
        )


# ─── Dashboard Views ──────────────────────────────────────────

class DashboardSummaryView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request, project_id):
        from projects.models import Project, ProjectMember
        project = get_object_or_404(Project, id=project_id)

        # Check membership: release_manager or project member
        is_member = (
            project.release_manager == request.user or
            ProjectMember.objects.filter(project=project, user=request.user).exists()
        )
        if not is_member:
            self.permission_denied(request, message="You do not have permission to perform this action.")

        bugs = Bug.objects.filter(project_id=project_id)
        severity_breakdown = bugs.values('severity').annotate(count=Count('severity'))

        return Response({
            "total_bugs": bugs.count(),
            "open_bugs": bugs.filter(status='open').count(),
            "resolved_bugs": bugs.filter(status='resolved').count(),
            "severity_breakdown": {item['severity']: item['count'] for item in severity_breakdown}
        })