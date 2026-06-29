import pytest
from django.urls import reverse

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

    # test_register_auto_assigns_developer ma password fix
    def test_register_auto_assigns_developer(self, api_client, developer_role):
        response = api_client.post(reverse('register'), {
            "username": "newuser",
            "email": "auto@test.com",
            "name": "New User",
            "password": "Test@1234",  # ← uppercase T fix
            "password2": "Test@1234",
        })
        assert response.status_code == 201
        assert response.data['user']['role'] == 'developer'
        assert 'access' in response.data['tokens']

    def test_register_cannot_self_assign_role(self, api_client, developer_role, rm_role):
        response = api_client.post(reverse('register'), {
            "username": "hacker",
            "email": "hacker@test.com",
            "name": "Hacker",
            "password": "test@1234",
            "password2": "test@1234",
            "role_id": rm_role.id
        })
        assert response.status_code == 201
        assert response.data['user']['role'] == 'developer'

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
    def test_register_invalid_role(self, api_client, developer_role):
        response = api_client.post('/api/auth/register/', {
            "username": "newuser",
            "email": "new@gmail.com",
            "name": "New User",
            "password": "Test@1234",
            "password2": "Test@1234",
            "role_id": 9999
        })
        # Backend le invalid role_id ignore garcha ra developer assign gardacha
        assert response.status_code == 201
        assert response.data['user']['role'] == 'developer'

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