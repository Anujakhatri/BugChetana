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
    reviewed_by_name = serializers.CharField(source='reviewed_by.name', read_only=True)
    latest_qa_result = serializers.SerializerMethodField()

    class Meta:
        model = Bug
        fields = (
            'id', 'title', 'description', 'status', 'severity', 'priority',
            'ai_status', 'predicted_severity', 'roast_commentary', 'solution_suggestion',
            'project', 'created_by', 'created_by_name',
            'assigned_to', 'assigned_to_name',
            'verified_by', 'verified_by_name',
            'qa_comment', 'reviewed_by', 'reviewed_by_name', 'reviewed_at',
            'latest_qa_result',
            'created_at', 'updated_at'
        )
        read_only_fields = (
            'created_by', 'ai_status',
            'predicted_severity', 'roast_commentary',
            'solution_suggestion', 'qa_comment', 'reviewed_by', 'reviewed_at',
            'created_at', 'updated_at'
        )

    def get_latest_qa_result(self, obj):
        qa = obj.qa_results.order_by('-tested_at').first()
        if not qa:
            return None
        return {
            'result': qa.result,
            'notes': qa.notes,
            'tested_at': qa.tested_at,
            'qa_name': qa.qa.name if qa.qa else None,
        }

class BugCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bug
        fields = (
            'id', 'title', 'description', 'status', 'severity', 'priority', 'assigned_to', 'predicted_severity', 'roast_commentary', 'ai_status',
        )
        read_only_fields = ('predicted_severity', 'ai_status')

class ReleaseSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)
    bugs = serializers.SerializerMethodField()

    class Meta:
        model = Release
        fields = ('id', 'version', 'title', 'project',
                  'created_by', 'created_by_name', 'bugs', 'released_at')
        read_only_fields = ('project', 'created_by', 'released_at')

    def get_bugs(self, obj):
        return obj.release_bugs.values_list('bug_id', flat=True)

class QAResultSerializer(serializers.ModelSerializer):
    qa_name = serializers.CharField(source='qa.name', read_only=True)

    class Meta:
        model = QAResult
        fields = ('id', 'bug', 'qa', 'qa_name', 'result', 'notes', 'tested_at')
        read_only_fields = ('bug', 'qa', 'tested_at')

    def validate(self, data):
        result = data.get('result')
        notes = (data.get('notes') or '').strip()
        if result == 'fail' and not notes:
            raise serializers.ValidationError(
                {'notes': 'A comment is required when marking a bug as failed.'}
            )
        if notes:
            data['notes'] = notes
        return data


class BugAssignSerializer(serializers.Serializer):
    assigned_to = serializers.IntegerField()

    def validate_assigned_to(self, value):
        try:
            user = User.objects.select_related('role').get(pk=value)
        except User.DoesNotExist:
            raise serializers.ValidationError('Developer not found.')
        if not user.role or user.role.name != 'Developer':
            raise serializers.ValidationError('Only Developer users can be assigned to bugs.')
        return value


class BugResubmitSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255, required=False)
    description = serializers.CharField(required=False)

    def validate(self, data):
        if not data.get('title') and not data.get('description'):
            raise serializers.ValidationError('Provide an updated title or description to resubmit.')
        return data