import pytest

@pytest.mark.django_db
class TestRegisterView:

    # Successful registration
    def test_register_success(self, api_client, role):
        response = api_client.post('/api/auth/register/', {
            "username": "newuser",
            "email": "new@gmail.com",
            "name": "New User",
            "password": "Test@1234",
            "password2": "Test@1234",
            "role_id": role.id
        })
        assert response.status_code == 201
        assert response.data['message'] == "Registration successful"
        assert "tokens" in response.data

    # Password match bhayena
    def test_register_password_mismatch(self, api_client, role):
        response = api_client.post('/api/auth/register/', {
            "username": "newuser",
            "email": "new@gmail.com",
            "name": "New User",
            "password": "Test@1234",
            "password2": "Wrong@1234",  # ← mismatch
            "role_id": role.id
        })
        assert response.status_code == 400
        assert "password" in response.data

    # Role exist gardaina
    def test_register_invalid_role(self, api_client):
        response = api_client.post('/api/auth/register/', {
            "username": "newuser",
            "email": "new@gmail.com",
            "name": "New User",
            "password": "Test@1234",
            "password2": "Test@1234",
            "role_id": 9999  # ← exist gardaina
        })
        assert response.status_code == 400
        assert "role_id" in response.data

    #  Duplicate email
    def test_register_duplicate_email(self, api_client, user, role):
        response = api_client.post('/api/auth/register/', {
            "username": "anotheruser",
            "email": "test@gmail.com",  # ← already exists
            "name": "Another User",
            "password": "Test@1234",
            "password2": "Test@1234",
            "role_id": role.id
        })
        assert response.status_code == 400

    #  Session create bhayo ki bhayena check
    def test_register_creates_session(self, api_client, role):
        from accounts.models import UserSession
        response = api_client.post('/api/auth/register/', {
            "username": "sessionuser",
            "email": "session@gmail.com",
            "name": "Session User",
            "password": "Test@1234",
            "password2": "Test@1234",
            "role_id": role.id
        })
        assert response.status_code == 201
        assert UserSession.objects.filter(
            user__email="session@gmail.com"
        ).exists()  # ← session database ma k cha?