import pytest
from rest_framework.test import APIClient
from accounts.models import Role, User

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def role(db):
    return Role.objects.create(name="developer")

@pytest.fixture
def user(db, role):
    return User.objects.create_user(
        username="testuser",
        email="test@gmail.com",
        name="Test User",
        password="Test@1234",
        role=role
    )

@pytest.fixture
def auth_client(api_client, user):
    response = api_client.post('/api/auth/login/', {
        "email": "test@gmail.com",
        "password": "Test@1234"
    })
    token = response.data['tokens']['access']
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return api_client, response.data['tokens']['refresh']