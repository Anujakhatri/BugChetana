# projects/tests/test_role.py
def test_admin_can_update_role(self, api_client, make_user, rm_role, qa_role, get_tokens):
    # ✅ use is_staff=True for admin, not release_manager
    admin_user = make_user('admin', 'admin@test.com', is_staff=True)
    dev_user = make_user('dev', 'dev@test.com')

    tokens = get_tokens('admin@test.com')
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

    res = api_client.patch(
        reverse('user-role-update', args=[dev_user.id]),
        {'role_id': qa_role.id},
    )
    assert res.status_code == 200
    assert res.data['user']['role'] == 'qa'