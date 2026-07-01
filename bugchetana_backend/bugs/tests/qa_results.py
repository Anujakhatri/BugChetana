import pytest

pytestmark = pytest.mark.django_db


class TestQAResults:
    def test_qa_can_add_result(self, qa_client, bug):
        response = qa_client.post(
            f'/api/bugs/{bug.id}/qa-result/',
            {
                'result': 'fail',
                'notes': 'Bug still reproducible on staging env'
            }
        )
        assert response.status_code == 201
        assert response.data['result'] == 'fail'

    def test_developer_cannot_add_qa_result(self, dev_client, bug):
        response = dev_client.post(
            f'/api/bugs/{bug.id}/qa-result/',
            {'result': 'pass', 'notes': 'Should not work'}
        )
        assert response.status_code == 403

    def test_rm_cannot_add_qa_result(self, rm_client, bug):
        response = rm_client.post(
            f'/api/bugs/{bug.id}/qa-result/',
            {'result': 'pass', 'notes': 'Should not work'}
        )
        assert response.status_code == 403

    def test_qa_result_pass(self, qa_client, bug):
        response = qa_client.post(
            f'/api/bugs/{bug.id}/qa-result/',
            {'result': 'pass', 'notes': 'All test cases passed'}
        )
        assert response.status_code == 201
        assert response.data['result'] == 'pass'