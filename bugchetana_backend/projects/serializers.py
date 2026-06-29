from rest_framework import serializers
from .models import Project, ProjectMember


class ProjectSerializer(serializers.ModelSerializer):
    release_manager_name = serializers.CharField(
        source='release_manager.name',
        read_only=True
    )
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = ('id', 'name', 'release_manager', 'release_manager_name',
                  'member_count', 'created_at')
        read_only_fields = ('created_at',)

    def get_member_count(self, obj):
        return obj.members.count()


class ProjectMemberSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.name', read_only=True)
    role = serializers.CharField(source='user.role.name', read_only=True)

    class Meta:
        model = ProjectMember
        fields = ('id', 'project', 'user', 'user_email', 'user_name',
                  'role', 'joined_at')
        read_only_fields = ('joined_at',)