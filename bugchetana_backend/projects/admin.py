from django.contrib import admin
from .models import Project, ProjectMember

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'release_manager', 'created_at']
    search_fields = ['name']
    raw_id_fields = ['release_manager']

@admin.register(ProjectMember)
class ProjectMemberAdmin(admin.ModelAdmin):
    list_display = ['id', 'project', 'user', 'joined_at']
    list_filter = ['project']
    raw_id_fields = ['project', 'user']