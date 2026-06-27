import pytest

@pytest.mark.django_db
class TestLogoutView:

    #  Successful logout
    def test_logout_success(self, auth_client):
        client, refresh_token = auth_client
        response = client.post('/api/auth/logout/', {
            "refresh": refresh_token
        })
        assert response.status_code == 200
        assert response.data['message'] == "Logout successful"

    #  Unauthenticated user
    def test_logout_unauthenticated(self, api_client):
        response = api_client.post('/api/auth/logout/', {
            "refresh": "sometoken"
        })
        assert response.status_code == 401

    #  Session delete bhyo ki bhayena
    def test_logout_deletes_session(self, auth_client):
        from accounts.models import UserSession
        client, refresh_token = auth_client
        client.post('/api/auth/logout/', {"refresh": refresh_token})
        assert not UserSession.objects.filter(
            refresh_token_hash__isnull=False
        ).exists()  # ← session delete bhayo?