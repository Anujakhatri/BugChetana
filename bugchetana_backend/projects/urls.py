from django.urls import path
from .views import (
    ProjectListCreateView,
    ProjectDetailView,
    ProjectMemberListView,
    AddProjectMemberView,
    RemoveProjectMemberView,
)

urlpatterns = [
    path('projects/', ProjectListCreateView.as_view(), name='projects-list-create'),
    path('projects/<int:pk>/', ProjectDetailView.as_view(), name='projects-detail'),
    path('projects/<int:project_id>/members/', ProjectMemberListView.as_view(), name='project-members-list'),
    path('projects/<int:project_id>/members/add/', AddProjectMemberView.as_view(), name='add-member'),
    path('projects/<int:project_id>/members/<int:user_id>/', RemoveProjectMemberView.as_view(), name='remove-member'),
]
