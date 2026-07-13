import pytest
from django.urls import reverse


@pytest.mark.django_db
class TestRoleUpdateView:   # ← class missing थियो!

    def test_admin_can_update_role(self, api_client, make_user, qa_role, get_tokens):
        admin_user = make_user('admin', 'admin@test.com', is_staff=True)
        dev_user = make_user('dev', 'dev@test.com')

        tokens = get_tokens('admin@test.com')
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        res = api_client.patch(
            reverse('user-role-update', args=[dev_user.id]),
            {'role_id': qa_role.id},
        )
        assert res.status_code == 200
        assert res.data['user']['role'] == 'QA'

    def test_release_manager_cannot_assign_release_manager_role(self, api_client, make_user, rm_role, get_tokens):
        # A Release Manager must not be able to assign the "Release Manager"
        # role to any other user — only admins can.
        rm_user = make_user('rm', 'rm@test.com', role=rm_role)
        dev_user = make_user('dev', 'dev@test.com')

        tokens = get_tokens('rm@test.com')
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        res = api_client.patch(
            reverse('user-role-update', args=[dev_user.id]),
            {'role_id': rm_role.id},
        )
        assert res.status_code == 403

    def test_release_manager_cannot_remove_release_manager_role(self, api_client, make_user, rm_role, qa_role, get_tokens):
        # A Release Manager must not be able to change a Release Manager's
        # role away from "Release Manager" — only admins can. This exercises
        # the "target currently is RM" branch of the body check (not the
        # "new role is RM" branch, which the previous test covers).
        rm_user = make_user('rm', 'rm@test.com', role=rm_role)
        other_rm = make_user('rm2', 'rm2@test.com', role=rm_role)

        tokens = get_tokens('rm@test.com')
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        res = api_client.patch(
            reverse('user-role-update', args=[other_rm.id]),
            {'role_id': qa_role.id},
        )
        assert res.status_code == 403

    def test_release_manager_can_change_developer_to_qa(self, api_client, make_user, rm_role, qa_role, get_tokens):
        rm_user = make_user('rm', 'rm@test.com', role=rm_role)
        dev_user = make_user('dev', 'dev@test.com')

        tokens = get_tokens('rm@test.com')
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        res = api_client.patch(
            reverse('user-role-update', args=[dev_user.id]),
            {'role_id': qa_role.id},
        )
        assert res.status_code == 200
        assert res.data['user']['role'] == 'QA'

    def test_release_manager_can_change_qa_to_developer(self, api_client, make_user, rm_role, qa_role, developer_role, get_tokens):
        rm_user = make_user('rm', 'rm@test.com', role=rm_role)
        qa_user = make_user('qa', 'qa@test.com', role=qa_role)

        tokens = get_tokens('rm@test.com')
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        res = api_client.patch(
            reverse('user-role-update', args=[qa_user.id]),
            {'role_id': developer_role.id},
        )
        assert res.status_code == 200
        assert res.data['user']['role'] == 'Developer'

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