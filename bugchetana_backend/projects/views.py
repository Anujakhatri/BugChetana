from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Project, ProjectMember
from accounts.permissions import IsReleaseManager
from .serializers import ProjectSerializer, ProjectMemberSerializer
from .permissions import IsProjectMember, IsOwnProjectReleaseManager, CanManageProjectMembers


class ProjectListCreateView(generics.ListCreateAPIView):
    serializer_class = ProjectSerializer
    permission_classes = (IsAuthenticated, IsReleaseManager)  # fixed: proper guard, not inline check

    def get_queryset(self):
        user = self.request.user
        role_name = user.role.name if user.role else None

        if role_name == 'Release Manager':
            return Project.objects.filter(release_manager=user)

        return Project.objects.filter(members__user=user)

    def perform_create(self, serializer):
        serializer.save(release_manager=self.request.user)


class ProjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProjectSerializer
    permission_classes = (IsAuthenticated, IsProjectMember)
    queryset = Project.objects.all()

class ProjectMemberListCreateView(generics.ListCreateAPIView):
    serializer_class = ProjectMemberSerializer
    permission_classes = (CanManageProjectMembers,)

    def get_queryset(self):
        return ProjectMember.objects.filter(project_id=self.kwargs['project_id'])

    def perform_create(self, serializer):
        serializer.save(project_id=self.kwargs['project_id'])

class AddProjectMemberView(APIView):
    permission_classes = (IsAuthenticated, IsOwnProjectReleaseManager)

    def post(self, request, project_id):
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response({"error": "Project not found"},
                            status=status.HTTP_404_NOT_FOUND)

        serializer = ProjectMemberSerializer(data={
            'project': project.id,
            'user': request.data.get('user_id')
        })
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({
            "message": "Member added successfully",
            "member": serializer.data
        }, status=status.HTTP_201_CREATED)


class RemoveProjectMemberView(APIView):
    permission_classes = (IsAuthenticated, CanManageProjectMembers)

    def delete(self, request, project_id, user_id):
        try:
            member = ProjectMember.objects.get(
                project_id=project_id,
                user_id=user_id
            )
            member.delete()
            return Response({"message": "Member removed"},
                            status=status.HTTP_200_OK)
        except ProjectMember.DoesNotExist:
            return Response({"error": "Member not found"},
                            status=status.HTTP_404_NOT_FOUND)