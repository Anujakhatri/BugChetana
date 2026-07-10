"""Integration tests for the QA verify flow + dashboard summary.

Confirms that the backend's ``pending_review_count`` (status='resolved'
AND verified_by__isnull=True) matches the client-side filter used in
QaDashboardPage.jsx to populate the Pending Review table.
"""
import pytest

from bugs.models import Bug, QAResult
from projects.models import Project, ProjectMember

pytestmark = pytest.mark.django_db


def _make_bug(project, created_by, status='open'):
    return Bug.objects.create(
        title=f'Bug {status}',
        description='desc',
        status=status,
        severity='medium',
        priority='high',
        project=project,
        created_by=created_by,
    )


def _login(api_client, user):
    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken.for_user(user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return api_client


def _set_verified(bug, user):
    """Simulate the result of a successful /verify/ PATCH without going
    through the view (which requires CanSubmitQAResult + a developer
    assignee, etc.)."""
    bug.verified_by = user
    bug.save(update_fields=['verified_by'])


def test_verify_creates_qaresult_with_verified_choice(qa_client, qa_user, project_with_members, developer):
    bug = _make_bug(project_with_members, developer, status='resolved')

    response = qa_client.patch(f'/api/bugs/{bug.id}/verify/')

    assert response.status_code == 200, response.data

    qa_result = QAResult.objects.get(bug=bug)
    assert qa_result.result == 'verified'  # the new choice, not 'pass'
    assert qa_result.qa == qa_user
    bug.refresh_from_db()
    assert bug.verified_by == qa_user


def test_pending_review_count_and_client_filter_agree(
    api_client, qa_user, developer, project_with_members
):
    """Build a fixture set, then compare:

      * backend pending_review_count from /api/dashboard/qa/
      * count of bugs the frontend's Pending Review filter would render
        (status='resolved' AND verified_by is null)
    """
    pending_resolved = _make_bug(project_with_members, developer, status='resolved')

    # NOT pending: resolved-but-verified, resubmitted, and open.
    # (Resubmitted is excluded by the backend's pending_review_count logic.)
    already_verified = _make_bug(project_with_members, developer, status='resolved')
    _set_verified(already_verified, qa_user)
    _make_bug(project_with_members, developer, status='resubmitted')
    _make_bug(project_with_members, developer, status='open')

    # Backend summary
    client = _login(api_client, qa_user)
    res = client.get('/api/dashboard/qa/')
    assert res.status_code == 200, res.data
    backend_count = res.data['pending_review_count']

    # Replicate the frontend filter exactly:
    #   b.status === "resolved" && !b.verified_by
    visible_bugs = Bug.objects.filter(project__members__user=qa_user)
    frontend_count = sum(
        1 for b in visible_bugs
        if b.status == 'resolved' and not b.verified_by
    )

    assert backend_count == 1
    assert frontend_count == 1
    assert backend_count == frontend_count, (
        f"Backend summary card ({backend_count}) and frontend Pending Review "
        f"table ({frontend_count}) disagree."
    )


def test_pending_review_count_excludes_resolved_already_verified(
    api_client, qa_user, developer, project_with_members
):
    """A resolved bug that already has verified_by set must NOT count
    toward pending review — this is the original filter mismatch."""
    _make_bug(project_with_members, developer, status='resolved')  # unverified → counts
    already_verified = _make_bug(project_with_members, developer, status='resolved')
    _set_verified(already_verified, qa_user)  # verified → must NOT count

    client = _login(api_client, qa_user)
    res = client.get('/api/dashboard/qa/')
    assert res.status_code == 200
    assert res.data['pending_review_count'] == 1
