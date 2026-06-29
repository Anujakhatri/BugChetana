from django.urls import path
from .views import (
    ProjectListCreateView,
    ProjectDetailView,
    AddProjectMemberView,
    RemoveProjectMemberView
)

urlpatterns = [
    path('', ProjectListCreateView.as_view(), name='projects-list-create'),
    path('<int:pk>/', ProjectDetailView.as_view(), name='projects-detail'),
    path('<int:project_id>/members/', AddProjectMemberView.as_view(), name='add-member'),
    path('<int:project_id>/members/<int:user_id>/', RemoveProjectMemberView.as_view(), name='remove-member'),
]