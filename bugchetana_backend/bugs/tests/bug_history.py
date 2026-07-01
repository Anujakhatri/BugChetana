import pytest
from bugs.models import BugHistory

pytestmark = pytest.mark.django_db


class TestBugHistory:
    def test_history_created_on_bug_create(self, bug):
        # Bug create huda automatically history create hunuparchha
        history = BugHistory.objects.filter(bug=bug)
        assert history.count() == 1
        assert history.first().old_status == 'none'
        assert history.first().new_status == 'open'

    def test_history_tracked_on_status_change(self, dev_client, bug):
        response = dev_client.patch(
            f'/api/bugs/{bug.id}/',
            {'status': 'in_progress'}
        )
        assert response.status_code == 200

        # 2 history entries hunuparchha — create + status change
        history = BugHistory.objects.filter(bug=bug).order_by('changed_at')
        assert history.count() == 2
        assert history.last().old_status == 'open'
        assert history.last().new_status == 'in_progress'

    def test_no_history_on_non_status_update(self, dev_client, bug):
        # Status change nagari title update garda history chainदैन
        dev_client.patch(f'/api/bugs/{bug.id}/', {'title': 'Updated Title'})

        history = BugHistory.objects.filter(bug=bug)
        assert history.count() == 1  # sirf initial create ko matra

    def test_history_list_endpoint(self, dev_client, bug):
        response = dev_client.get(f'/api/bugs/{bug.id}/history/')
        assert response.status_code == 200
        assert len(response.data) >= 1