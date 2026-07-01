import pytest
from bugs.models import ReleaseBug

pytestmark = pytest.mark.django_db


class TestReleases:
    def test_rm_can_create_release(self, rm_client, project_with_members):
        response = rm_client.post(
            f'/api/projects/{project_with_members.id}/releases/',
            {
                'version': 'v1.0.0',
                'title': 'First Release'
            }
        )
        assert response.status_code == 201
        assert response.data['version'] == 'v1.0.0'

    def test_developer_cannot_create_release(self, dev_client, project_with_members):
        response = dev_client.post(
            f'/api/projects/{project_with_members.id}/releases/',
            {'version': 'v1.0.0', 'title': 'Should fail'}
        )
        assert response.status_code == 403

    def test_qa_cannot_create_release(self, qa_client, project_with_members):
        response = qa_client.post(
            f'/api/projects/{project_with_members.id}/releases/',
            {'version': 'v1.0.0', 'title': 'Should fail'}
        )
        assert response.status_code == 403

    def test_rm_can_add_bug_to_release(self, rm_client, project_with_members, bug):
        # Release create gara
        release_response = rm_client.post(
            f'/api/projects/{project_with_members.id}/releases/',
            {'version': 'v1.0.0', 'title': 'First Release'}
        )
        release_id = release_response.data['id']

        # Bug add gara release ma
        response = rm_client.post(
            f'/api/releases/{release_id}/add-bug/',
            {'bug_id': bug.id}
        )
        assert response.status_code == 201
        assert ReleaseBug.objects.filter(release_id=release_id, bug=bug).exists()

    def test_duplicate_bug_in_release_fails(self, rm_client, project_with_members, bug):
        release_response = rm_client.post(
            f'/api/projects/{project_with_members.id}/releases/',
            {'version': 'v1.0.0', 'title': 'First Release'}
        )
        release_id = release_response.data['id']

        # Pehilo palta — success
        rm_client.post(f'/api/releases/{release_id}/add-bug/', {'bug_id': bug.id})

        # Dosro palta same bug — fail hunuparchha
        response = rm_client.post(f'/api/releases/{release_id}/add-bug/', {'bug_id': bug.id})
        assert response.status_code == 400