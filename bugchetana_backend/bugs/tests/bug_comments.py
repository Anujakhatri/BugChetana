import pytest

pytestmark = pytest.mark.django_db


class TestBugComments:
    def test_developer_can_comment(self, dev_client, bug):
        response = dev_client.post(
            f'/api/bugs/{bug.id}/comments/',
            {'comment_text': 'Looking into this bug now'}
        )
        assert response.status_code == 201
        assert response.data['comment_text'] == 'Looking into this bug now'

    def test_qa_can_comment(self, qa_client, bug):
        response = qa_client.post(
            f'/api/bugs/{bug.id}/comments/',
            {'comment_text': 'Verified this bug on staging'}
        )
        assert response.status_code == 201

    def test_rm_can_comment(self, rm_client, bug):
        response = rm_client.post(
            f'/api/bugs/{bug.id}/comments/',
            {'comment_text': 'Prioritizing for next release'}
        )
        assert response.status_code == 201

    def test_unauthenticated_cannot_comment(self, api_client, bug):
        response = api_client.post(
            f'/api/bugs/{bug.id}/comments/',
            {'comment_text': 'Should fail'}
        )
        assert response.status_code == 401

    def test_comment_list(self, dev_client, qa_client, bug):
        # 2 comments add gara
        dev_client.post(f'/api/bugs/{bug.id}/comments/', {'comment_text': 'Dev comment'})
        qa_client.post(f'/api/bugs/{bug.id}/comments/', {'comment_text': 'QA comment'})

        response = dev_client.get(f'/api/bugs/{bug.id}/comments/')
        assert response.status_code == 200
        assert len(response.data) == 2