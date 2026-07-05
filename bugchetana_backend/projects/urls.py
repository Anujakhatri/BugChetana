from django.urls import path
from .views import (
    ProjectListCreateView,
    ProjectDetailView,
    ProjectMemberListView,
    AddProjectMemberView,
    RemoveProjectMemberView,
)

urlpatterns = [
    path('', ProjectListCreateView.as_view(), name='projects-list-create'),
    path('<int:pk>/', ProjectDetailView.as_view(), name='projects-detail'),
    path('<int:project_id>/members/', ProjectMemberListView.as_view(), name='project-members-list'),
    path('<int:project_id>/members/add/', AddProjectMemberView.as_view(), name='add-member'),
    path('<int:project_id>/members/<int:user_id>/', RemoveProjectMemberView.as_view(), name='remove-member'),
]