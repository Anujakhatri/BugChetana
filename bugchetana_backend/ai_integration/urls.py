from django.urls import path
from .views import BugRoastView, BugSuggestFixView

urlpatterns = [
    path('bugs/<int:bug_id>/roast/', BugRoastView.as_view(), name='bug-roast'),
    path('bugs/<int:bug_id>/suggest/', BugSuggestFixView.as_view(), name='bug-suggest-fix'),
]