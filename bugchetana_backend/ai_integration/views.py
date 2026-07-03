import logging
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404

from bugs.models import Bug
from bugs.permissions import HasBugAccess
from .permissions import IsDevOrQA
from .ai_service import generate_roast, suggest_fix

logger = logging.getLogger(__name__)


class BugRoastView(APIView):
    permission_classes = (IsAuthenticated, HasBugAccess, IsDevOrQA)

    def post(self, request, bug_id):
        bug = get_object_or_404(Bug, id=bug_id)

        try:
            roast = generate_roast(bug.description)
        except Exception as e:
            logger.warning(f"Groq roast generation failed for bug {bug_id}: {e}")
            return Response(
                {"error": "Roast generation is temporarily unavailable. Try again shortly."},
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
                {"error": "Fix suggestion is temporarily unavailable. Try again shortly."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        bug.solution_suggestion = suggestion
        bug.save(update_fields=['solution_suggestion'])

        return Response({"bug_id": bug.id, "solution_suggestion": suggestion})