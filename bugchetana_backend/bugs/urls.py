from django.urls import path
from .views import (
    BugListCreateView, BugDetailView,
    BugCommentListCreateView, BugHistoryListView,
    QAResultCreateView, BugAssignView, BugResubmitView,
    ReleaseListCreateView, AddBugToReleaseView,
    DashboardSummaryView
)

urlpatterns = [
    # Dashboard
    path('projects/<int:project_id>/dashboard/', DashboardSummaryView.as_view(), name='dashboard-summary'),

    # Bugs
    path('projects/<int:project_id>/bugs/', BugListCreateView.as_view(), name='bug-list-create'),
    path('bugs/<int:pk>/', BugDetailView.as_view(), name='bug-detail'),
    path('bugs/<int:pk>/assign/', BugAssignView.as_view(), name='bug-assign'),
    path('bugs/<int:pk>/resubmit/', BugResubmitView.as_view(), name='bug-resubmit'),

    # Comments
    path('bugs/<int:bug_id>/comments/', BugCommentListCreateView.as_view(), name='bug-comments'),

    # History
    path('bugs/<int:bug_id>/history/', BugHistoryListView.as_view(), name='bug-history'),

    # QA Results
    path('bugs/<int:bug_id>/qa-result/', QAResultCreateView.as_view(), name='qa-result'),

    # Releases
    path('projects/<int:project_id>/releases/', ReleaseListCreateView.as_view(), name='releases'),
    path('releases/<int:release_id>/add-bug/', AddBugToReleaseView.as_view(), name='add-bug-to-release'),
]