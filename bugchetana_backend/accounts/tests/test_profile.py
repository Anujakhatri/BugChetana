import pytest
from django.urls import reverse

@pytest.mark.django_db
class TestProfileView:

    #  Authenticated user profile
    def test_profile_success(self, auth_client):
        client, _ = auth_client
        response = client.get('/api/auth/profile/')
        assert response.status_code == 200
        assert "email" in response.data

    # Profile returns current user with role
    def test_profile_returns_current_user(self, api_client, make_user, qa_role, get_tokens):
        make_user('cap', 'cap@test.com', role=qa_role)
        tokens = get_tokens('cap@test.com')
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        res = api_client.get(reverse('profile'))
        assert res.status_code == 200
        assert res.data['email'] == 'cap@test.com'
        assert res.data['role'] == 'QA'

    #  Unauthenticated user
    def test_profile_unauthenticated(self, api_client):
        response = api_client.get('/api/auth/profile/')
        assert response.status_code == 401