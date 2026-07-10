from django.urls import path
from .views import (
    BugListCreateView, BugDetailView,
    BugCommentListCreateView, BugHistoryListView,
    QAResultCreateView, BugAssignView, BugResubmitView, BugVerifyView,
    ReleaseListCreateView, AddBugToReleaseView,
    DashboardSummaryView,
    QaDashboardSummaryView, DeveloperDashboardSummaryView,
    DeveloperSubmittedBugsView, QAResultHistoryView,
    BugListCreateViewForProject, BugListItemAddView, ReleaseManagerHistoryView,
)

urlpatterns = [
    # Dashboard
    path('projects/<int:project_id>/dashboard/', DashboardSummaryView.as_view(), name='dashboard-summary'),
    path('dashboard/qa/', QaDashboardSummaryView.as_view(), name='dashboard-qa'),
    path('dashboard/developer/', DeveloperDashboardSummaryView.as_view(), name='dashboard-developer'),

    # Bugs
    path('projects/<int:project_id>/bugs/', BugListCreateView.as_view(), name='bug-list-create'),
    path('bugs/mine/', DeveloperSubmittedBugsView.as_view(), name='developer-submitted-bugs'),
    path('bugs/<int:pk>/', BugDetailView.as_view(), name='bug-detail'),
    path('bugs/<int:pk>/assign/', BugAssignView.as_view(), name='bug-assign'),
    path('bugs/<int:pk>/resubmit/', BugResubmitView.as_view(), name='bug-resubmit'),
    path('bugs/<int:pk>/verify/', BugVerifyView.as_view(), name='bug-verify'),

    # Comments
    path('bugs/<int:bug_id>/comments/', BugCommentListCreateView.as_view(), name='bug-comments'),

    # History
    path('bugs/<int:bug_id>/history/', BugHistoryListView.as_view(), name='bug-history'),

    # QA Results
    path('bugs/<int:bug_id>/qa-result/', QAResultCreateView.as_view(), name='qa-result'),
    path('qa-results/mine/', QAResultHistoryView.as_view(), name='qa-result-history'),

    # Bug lists (QA)
    path('projects/<int:project_id>/bug-lists/', BugListCreateViewForProject.as_view(), name='bug-lists'),
    path('projects/<int:project_id>/bug-lists/<int:bug_list_id>/items/', BugListItemAddView.as_view(), name='bug-list-items-add'),

    # Release Manager history
    path('release-manager/history/', ReleaseManagerHistoryView.as_view(), name='release-manager-history'),

    # Releases
    path('projects/<int:project_id>/releases/', ReleaseListCreateView.as_view(), name='releases'),
    path('releases/<int:release_id>/add-bug/', AddBugToReleaseView.as_view(), name='add-bug-to-release'),
]