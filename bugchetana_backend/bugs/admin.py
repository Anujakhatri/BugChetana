from django.contrib import admin
from .models import Bug, BugComment, BugHistory, Release, ReleaseBug, QAResult, BugList, BugListItem

@admin.register(Bug)
class BugAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'status', 'severity', 'priority', 'project', 'created_by', 'assigned_to', 'created_at']
    list_filter = ['status', 'severity', 'priority', 'project']
    search_fields = ['title', 'description']
    raw_id_fields = ['created_by', 'assigned_to', 'verified_by', 'project']

@admin.register(BugComment)
class BugCommentAdmin(admin.ModelAdmin):
    list_display = ['id', 'bug', 'user', 'created_at']
    raw_id_fields = ['bug', 'user']

@admin.register(BugHistory)
class BugHistoryAdmin(admin.ModelAdmin):
    list_display = ['id', 'bug', 'changed_by', 'old_status', 'new_status', 'changed_at']
    raw_id_fields = ['bug', 'changed_by']

@admin.register(Release)
class ReleaseAdmin(admin.ModelAdmin):
    list_display = ['id', 'version', 'title', 'project', 'created_by', 'released_at']
    raw_id_fields = ['project', 'created_by']

@admin.register(ReleaseBug)
class ReleaseBugAdmin(admin.ModelAdmin):
    list_display = ['id', 'release', 'bug', 'added_at']

@admin.register(QAResult)
class QAResultAdmin(admin.ModelAdmin):
    list_display = ['id', 'bug', 'qa', 'result', 'tested_at']
    raw_id_fields = ['bug', 'qa']

@admin.register(BugList)
class BugListAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'project', 'created_by', 'created_at']
    list_filter = ['project']
    search_fields = ['name']
    raw_id_fields = ['project', 'created_by']

@admin.register(BugListItem)
class BugListItemAdmin(admin.ModelAdmin):
    list_display = ['id', 'bug_list', 'bug']
    raw_id_fields = ['bug_list', 'bug']
