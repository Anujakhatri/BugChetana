from rest_framework import serializers
from .models import Project, ProjectMember


class ProjectSerializer(serializers.ModelSerializer):
    release_manager_name = serializers.CharField(
        source='release_manager.name',
        read_only=True
    )
    member_count = serializers.SerializerMethodField()
    qa_members = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = (
            'id', 'name', 'description', 'release_manager', 'release_manager_name',
            'member_count', 'qa_members', 'created_at',
        )
        read_only_fields = ('created_at',)

    def get_member_count(self, obj):
        return obj.members.count()

    def get_qa_members(self, obj):
        return [
            {
                'id': m.user_id,
                'name': m.user.name,
                'email': m.user.email,
            }
            for m in obj.members.select_related('user', 'user__role').filter(
                user__role__name__iexact='QA'
            )
        ]


class ProjectCreateSerializer(serializers.ModelSerializer):
    qa_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        write_only=True,
    )

    class Meta:
        model = Project
        fields = ('name', 'description', 'qa_ids')


class ProjectMemberSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.name', read_only=True)
    role = serializers.CharField(source='user.role.name', read_only=True)
    assigned_by_name = serializers.CharField(source='assigned_by.name', read_only=True)

    class Meta:
        model = ProjectMember
        fields = (
            'id', 'project', 'user', 'user_email', 'user_name',
            'role', 'assigned_by', 'assigned_by_name', 'joined_at',
        )
        read_only_fields = ('joined_at', 'assigned_by')