import pytest
from django.urls import reverse


@pytest.mark.django_db
class TestRoleUpdateView:

    # Release manager can update role
    def test_release_manager_can_update_role(self, api_client, make_user, rm_role, qa_role, get_tokens):
        rm_user = make_user('rm', 'rm@test.com', role=rm_role)
        dev_user = make_user('dev', 'dev@test.com')

        tokens = get_tokens('rm@test.com')
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        res = api_client.patch(
            reverse('user-role-update', args=[dev_user.id]),
            {'role_id': qa_role.id},
        )
        assert res.status_code == 200
        assert res.data['user']['role'] == 'qa'

    # Developer cannot update role
    def test_developer_cannot_update_role(self, api_client, make_user, rm_role, get_tokens):
        dev1 = make_user('dev1', 'dev1@test.com')
        dev2 = make_user('dev2', 'dev2@test.com')

        tokens = get_tokens('dev1@test.com')
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        res = api_client.patch(
            reverse('user-role-update', args=[dev2.id]),
            {'role_id': rm_role.id},
        )
        assert res.status_code == 403