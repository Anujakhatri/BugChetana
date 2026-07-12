"""
End-to-end tests for BugResubmitView.

Pins the contract that a developer can resubmit a failed bug with a free-text
`notes` field (recorded in BugHistory + as a BugComment), and that title /
description remain optional amendments.
"""
import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from django.urls import reverse
from bugs.models import Bug, BugComment, BugHistory

pytestmark = pytest.mark.django_db


def _auth(client, user):
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return client


def _make_failed_bug(project, developer, **overrides):
    defaults = dict(
        title='Login button broken',
        description='Original description',
        status='failed',
        severity='medium',
        priority='high',
        project=project,
        created_by=developer,
        assigned_to=developer,
    )
    defaults.update(overrides)
    return Bug.objects.create(**defaults)


def test_resubmit_with_only_notes_succeeds(project_with_members, developer, qa_user):
    """The original bug from the user's report: notes-only payload must succeed."""
    bug = _make_failed_bug(project_with_members, developer)
    history_before = BugHistory.objects.filter(bug=bug).count()

    client = _auth(APIClient(), developer)

    res = client.post(
        reverse('bug-resubmit', args=[bug.id]),
        {'notes': 'Fixed the null-check in the auth handler.'},
        format='json',
    )

    assert res.status_code == 200, res.data
    body = res.data
    assert body['status'] == 'resubmitted'
    assert body['title'] == 'Login button broken'  # unchanged
    assert body['description'] == 'Original description'  # unchanged
    assert body['qa_comment'] is None  # cleared on resubmit

    # Audit trail: a BugComment carrying the note…
    comments = list(BugComment.objects.filter(bug=bug).values_list('comment_text', flat=True))
    assert 'Fixed the null-check in the auth handler.' in comments

    # …and at least one new BugHistory row whose new_status is 'resubmitted' and
    # whose notes match what the developer typed. (Other pre-existing rows may
    # exist from the bug-creation signal; we look for the row this view added.)
    history_rows = list(
        BugHistory.objects.filter(bug=bug, new_status='resubmitted')
    )
    assert len(history_rows) >= 1
    resubmit_row = next((r for r in history_rows if r.notes), None)
    assert resubmit_row is not None, "Expected a BugHistory row with notes"
    assert resubmit_row.notes == 'Fixed the null-check in the auth handler.'
    assert resubmit_row.changed_by_id == developer.id
    # Note: the model's post_save signal also writes a status-change row when
    # bug.save() runs in the view (matching the established pattern in
    # BugDetailView.perform_update / BugAssignView). We assert that at least
    # one new row was added (not the exact count) to keep this test focused
    # on the resubmit-specific contract.
    assert BugHistory.objects.filter(bug=bug).count() >= history_before + 1


def test_resubmit_with_notes_and_optional_edits(project_with_members, developer):
    """title/description remain optional and amendable alongside the note."""
    bug = _make_failed_bug(project_with_members, developer)
    client = _auth(APIClient(), developer)

    res = client.post(
        reverse('bug-resubmit', args=[bug.id]),
        {
            'notes': 'Refactored to use a single helper.',
            'title': 'Login button — fixed',
            'description': 'Updated description after refactor.',
        },
        format='json',
    )

    assert res.status_code == 200, res.data
    assert res.data['title'] == 'Login button — fixed'
    assert res.data['description'] == 'Updated description after refactor.'
    assert res.data['status'] == 'resubmitted'

    bug.refresh_from_db()
    assert bug.title == 'Login button — fixed'
    assert bug.description == 'Updated description after refactor.'


def test_resubmit_rejects_missing_notes(project_with_members, developer):
    """An empty/missing `notes` payload must 400, not silently succeed."""
    bug = _make_failed_bug(project_with_members, developer)
    client = _auth(APIClient(), developer)

    for payload in [{}, {'notes': ''}, {'notes': '   '}]:
        res = client.post(reverse('bug-resubmit', args=[bug.id]), payload, format='json')
        assert res.status_code == 400, (payload, res.data)
        # The notes field-level error should be present (or a non_field_errors
        # message containing the same intent). Either signals the validation
        # caught the empty notes.
        assert 'notes' in res.data or 'non_field_errors' in res.data, (payload, res.data)


def test_resubmit_rejects_non_failed_bug(project_with_members, developer):
    """A bug in 'open' status must NOT be moved to 'resubmitted'."""
    bug = _make_failed_bug(project_with_members, developer, status='open')
    comments_before = BugComment.objects.filter(bug=bug).count()
    resubmit_rows_before = BugHistory.objects.filter(
        bug=bug, new_status='resubmitted'
    ).count()

    client = _auth(APIClient(), developer)

    res = client.post(
        reverse('bug-resubmit', args=[bug.id]),
        {'notes': 'Trying to resubmit an open bug.'},
        format='json',
    )

    assert res.status_code == 400, res.data
    bug.refresh_from_db()
    assert bug.status == 'open'
    # No BugComment or resubmit-row should be written when the status guard fails.
    assert BugComment.objects.filter(bug=bug).count() == comments_before
    assert (
        BugHistory.objects.filter(bug=bug, new_status='resubmitted').count()
        == resubmit_rows_before
    )
