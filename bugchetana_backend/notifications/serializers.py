from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    related_bug_id = serializers.IntegerField(read_only=True)
    related_project_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = Notification
        fields = (
            'id', 'message', 'related_bug_id', 'related_project_id',
            'is_read', 'created_at',
        )
        read_only_fields = fields
