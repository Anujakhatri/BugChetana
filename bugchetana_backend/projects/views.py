from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404

from accounts.permissions import get_role, IsReleaseManager
from notifications.services import create_notification
from .models import Project, ProjectMember
from .serializers import ProjectSerializer, ProjectCreateSerializer, ProjectMemberSerializer
from .permissions import IsProjectMember, IsOwnProjectReleaseManager, CanManageProjectMembers

User = get_user_model()


class ProjectListCreateView(generics.ListCreateAPIView):
    permission_classes = (IsAuthenticated, IsReleaseManager)

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ProjectCreateSerializer
        return ProjectSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsReleaseManager()]

    def get_queryset(self):
        user = self.request.user
        role_name = user.role.name if user.role else None

        if role_name == 'Release Manager':
            return Project.objects.filter(release_manager=user)

        return Project.objects.filter(members__user=user).distinct()

    def perform_create(self, serializer):
        qa_ids = serializer.validated_data.pop('qa_ids', [])
        project = serializer.save(release_manager=self.request.user)

        for qa_id in qa_ids:
            try:
                qa_user = User.objects.select_related('role').get(pk=qa_id)
            except User.DoesNotExist:
                continue
            if qa_user.role and qa_user.role.name.lower() == 'qa':
                ProjectMember.objects.get_or_create(
                    project=project,
                    user=qa_user,
                    defaults={'assigned_by': self.request.user},
                )
                create_notification(
                    recipient=qa_user,
                    message=f'You have been assigned to project "{project.name}".',
                    related_project=project,
                )


class ProjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProjectSerializer
    permission_classes = (IsAuthenticated, IsProjectMember)
    queryset = Project.objects.all()


class ProjectMemberListView(generics.ListAPIView):
    serializer_class = ProjectMemberSerializer
    permission_classes = (IsAuthenticated, CanManageProjectMembers)

    def get_queryset(self):
        # Only Developer-role members are surfaced here — the QA dashboard's
        # "Project Developers" panel is for the dev team only. QA/RM members
        # are exposed via the project's `qa_members` field on ProjectSerializer
        # (see ProjectSerializer.get_qa_members) and via the release_manager
        # field, so this filter doesn't lose information — it only stops
        # non-developer members from showing up in the dev-team UI.
        return ProjectMember.objects.filter(
            project_id=self.kwargs['project_id'],
            user__role__name__iexact='Developer',
        ).select_related('user', 'user__role', 'assigned_by')


class AddProjectMemberView(APIView):
    permission_classes = (IsAuthenticated, CanManageProjectMembers)

    def post(self, request, project_id):
        project = get_object_or_404(Project, id=project_id)
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'error.txt': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            member_user = User.objects.select_related('role').get(pk=user_id)
        except User.DoesNotExist:
            return Response({'error.txt': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        role = get_role(request.user)
        member_role = member_user.role.name if member_user.role else None

        if role == 'QA':
            if member_role != 'Developer':
                return Response(
                    {'error.txt': 'QA can only assign Developer users to a project.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        elif role == 'Release Manager':
            if member_role not in ('Developer', 'QA'):
                return Response(
                    {'error.txt': 'Only Developer or QA users can be added to a project.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        member, created = ProjectMember.objects.get_or_create(
            project=project,
            user=member_user,
            defaults={'assigned_by': request.user},
        )
        if not created:
            return Response({'error.txt': 'User is already a project member.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = ProjectMemberSerializer(member)
        if member_role == 'Developer':
            create_notification(
                recipient=member_user,
                message=f'You have been assigned to project "{project.name}".',
                related_project=project,
            )

        return Response({
            'message': 'Member added successfully',
            'member': serializer.data,
        }, status=status.HTTP_201_CREATED)


class RemoveProjectMemberView(APIView):
    permission_classes = (IsAuthenticated, CanManageProjectMembers)

    def delete(self, request, project_id, user_id):
        # Reject self-removal. Otherwise a user could accidentally (or
        # maliciously via direct API call) drop themselves from a project
        # they need access to. The frontend also hides the Remove button on
        # the user's own row, but we don't trust the client.
        if str(user_id) == str(request.user.id):
            return Response(
                {'error.txt': 'You cannot remove yourself from a project.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            member = ProjectMember.objects.get(
                project_id=project_id,
                user_id=user_id,
            )
            member.delete()
            return Response({'message': 'Member removed'}, status=status.HTTP_200_OK)
        except ProjectMember.DoesNotExist:
            return Response({'error.txt': 'Member not found'}, status=status.HTTP_404_NOT_FOUND)
