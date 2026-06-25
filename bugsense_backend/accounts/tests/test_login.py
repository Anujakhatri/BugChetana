
import pytest

@pytest.mark.django_db
class TestLoginView:

    # Successful login
    def test_login_success(self, api_client, user):
        response = api_client.post('/api/auth/login/', {
            "email": "test@gmail.com",
            "password": "Test@1234"
        })
        assert response.status_code == 200
        assert response.data['message'] == "Login successful"
        assert "access" in response.data['tokens']
        assert "refresh" in response.data['tokens']

    # Wrong password
    def test_login_wrong_password(self, api_client, user):
        response = api_client.post('/api/auth/login/', {
            "email": "test@gmail.com",
            "password": "WrongPassword"
        })
        assert response.status_code == 401

    # User exist gardaina
    def test_login_user_not_found(self, api_client):
        response = api_client.post('/api/auth/login/', {
            "email": "notfound@gmail.com",
            "password": "Test@1234"
        })
        assert response.status_code == 401

    # Session create bhyo ki bhayena
    def test_login_creates_session(self, api_client, user):
        from accounts.models import UserSession
        api_client.post('/api/auth/login/', {
            "email": "test@gmail.com",
            "password": "Test@1234"
        })
        assert UserSession.objects.filter(user=user).exists()