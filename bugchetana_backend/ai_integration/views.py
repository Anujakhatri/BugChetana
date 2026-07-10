import logging
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework.throttling import AnonRateThrottle
from django.shortcuts import get_object_or_404

from bugs.models import Bug
from bugs.permissions import HasBugAccess
from .permissions import IsDevOrQA
from .ai_service import generate_roast, suggest_fix
from .ml_service import predict_severity_with_confidence
from .services import build_prediction_response

logger = logging.getLogger(__name__)


class GuestAIReviewThrottle(AnonRateThrottle):
    scope = 'guest_ai'


class PredictSeverityView(APIView):
    """Stateless severity prediction — does not create a Bug record."""
    permission_classes = (AllowAny,)

    def post(self, request):
        title = (request.data.get('title') or '').strip()
        description = (request.data.get('description') or '').strip()

        if not title and not description:
            return Response(
                {'error.txt': 'title or description is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            severity, confidence = predict_severity_with_confidence(title, description)
        except Exception as e:
            logger.warning(f"Severity prediction failed: {e}")
            return Response(
                {'error.txt': 'Severity prediction is temporarily unavailable.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(build_prediction_response(severity, confidence))


class GuestAIReviewView(APIView):
    """Stateless roast + fix suggestions for the public bug-report flow."""
    permission_classes = (AllowAny,)
    throttle_classes = (GuestAIReviewThrottle,)

    def post(self, request):
        title = (request.data.get('title') or '').strip()
        description = (request.data.get('description') or '').strip()
        severity = (request.data.get('severity') or 'medium').strip().lower()

        if not title and not description:
            return Response(
                {'error.txt': 'title or description is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        bug_text = f"{title}\n\n{description}".strip() if title and description else (title or description)

        try:
            roast = generate_roast(bug_text)
            fix_suggestions = suggest_fix(bug_text, severity)
        except Exception as e:
            logger.warning(f"Guest AI review failed: {e}")
            return Response(
                {'error.txt': 'AI review is temporarily unavailable. Try again shortly.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response({
            'roast': roast,
            'fix_suggestions': fix_suggestions,
        })


class BugRoastView(APIView):
    permission_classes = (IsAuthenticated, IsDevOrQA)

    def post(self, request, bug_id):
        bug = get_object_or_404(Bug, id=bug_id)

        try:
            roast = generate_roast(bug.description)
        except Exception as e:
            logger.warning(f"Groq roast generation failed for bug {bug_id}: {e}")
            return Response(
                {"error.txt": "Roast generation is temporarily unavailable. Try again shortly."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        bug.roast_commentary = roast
        bug.save(update_fields=['roast_commentary'])

        return Response({"bug_id": bug.id, "roast_commentary": roast})


class BugSuggestFixView(APIView):
    permission_classes = (IsAuthenticated, HasBugAccess, IsDevOrQA)

    def post(self, request, bug_id):
        bug = get_object_or_404(Bug, id=bug_id)

        try:
            suggestion = suggest_fix(bug.description, bug.severity)
        except Exception as e:
            logger.warning(f"Groq suggest_fix failed for bug {bug_id}: {e}")
            return Response(
                {"error.txt": "Fix suggestion is temporarily unavailable. Try again shortly."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        bug.solution_suggestion = suggestion
        bug.save(update_fields=['solution_suggestion'])

        return Response({"bug_id": bug.id, "solution_suggestion": suggestion})