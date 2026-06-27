import pytest

@pytest.mark.django_db
class TestProfileView:

    #  Authenticated user profile
    def test_profile_success(self, auth_client):
        client, _ = auth_client
        response = client.get('/api/auth/profile/')
        assert response.status_code == 200
        assert "email" in response.data

    #  Unauthenticated user
    def test_profile_unauthenticated(self, api_client):
        response = api_client.get('/api/auth/profile/')
        assert response.status_code == 401