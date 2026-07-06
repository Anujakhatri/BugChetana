from django.urls import path
from .views import BugRoastView, BugSuggestFixView, PredictSeverityView, GuestAIReviewView

urlpatterns = [
    path('ai/predict-severity/', PredictSeverityView.as_view(), name='predict-severity'),
    path('ai/review-guest/', GuestAIReviewView.as_view(), name='guest-ai-review'),
    path('bugs/<int:bug_id>/roast/', BugRoastView.as_view(), name='bug-roast'),
    path('bugs/<int:bug_id>/suggest/', BugSuggestFixView.as_view(), name='bug-suggest-fix'),
]