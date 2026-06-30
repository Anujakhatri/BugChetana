from rest_framework import serializers
from .models import Bug, BugComment, BugHistory, Release, ReleaseBug, QAResult
from accounts.models import User


class BugCommentSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.name', read_only=True)

    class Meta:
        model = BugComment
        fields = ('id', 'bug', 'user', 'user_name','comment_text', 'created_at')
        read_only_fields = ('created_at', 'user')


class BugHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(source='changed_by.name', read_only=True)

    class Meta:
        model = BugHistory
        fields = ('id', 'bug', 'changed_by', 'changed_by_name',
                  'old_status', 'new_status', 'changed_at')
        read_only_fields = ('changed_by', 'changed_by_name','changed_at')


class BugSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.name', read_only=True)
    verified_by_name = serializers.CharField(source='verified_by.name', read_only=True)

    class Meta:
        model = Bug
        fields = (
            'id', 'title', 'description', 'status', 'severity', 'priority',
            'ai_status', 'predicted_severity', 'roast_commentary', 'solution_suggestion',
            'project', 'created_by', 'created_by_name',
            'assigned_to', 'assigned_to_name',
            'verified_by', 'verified_by_name',
            'created_at', 'updated_at'
        )
        read_only_fields = (
            'created_by', 'ai_status',
            'predicted_severity', 'roast_commentary',
            'solution_suggestion', 'created_at', 'updated_at'
        )

class BugCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bug
        fields = (
            'title', 'description', 'status', 'severity', 'priority', 'assigned_to'
        )

class ReleaseSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)
    bugs = serializers.SerializerMethodField()

    class Meta:
        model = Release
        fields = ('id', 'version', 'title', 'project',
                  'created_by', 'created_by_name', 'bugs', 'released_at')
        read_only_fields = ('created_by', 'released_at')

    def get_bugs(self, obj):
        return obj.release_bugs.values_list('bug_id', flat=True)

class QAResultSerializer(serializers.ModelSerializer):
    qa_name = serializers.CharField(source='qa.name', read_only=True)

    class Meta:
        model = QAResult
        fields = ('id', 'bug', 'qa', 'qa_name', 'result', 'notes', 'tested_at')
        read_only_fields = ('bug', 'qa', 'tested_at')