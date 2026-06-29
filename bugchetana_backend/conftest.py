import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from accounts.models import Role, UserSession

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def developer_role(db):
    return Role.objects.get_or_create(name='developer', defaults={'description': 'Developer role'})[0]


@pytest.fixture
def qa_role(db):
    return Role.objects.get_or_create(name='qa', defaults={'description': 'QA role'})[0]


@pytest.fixture
def rm_role(db):
    return Role.objects.get_or_create(name='release_manager', defaults={'description': 'Release Manager role'})[0]


@pytest.fixture
def role(db):
    return Role.objects.get_or_create(name="developer")[0]  # get_or_create, duplicate hudaina


@pytest.fixture
def make_user(db, developer_role):
    def _make(username, email, password='testpass123', role=None, is_staff=False):
        return User.objects.create_user(
            username=username,
            email=email,
            name=username,
            password=password,
            role=role or developer_role,
            is_staff=is_staff,
        )
    return _make


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
def get_tokens(api_client):   # ← get_token hoina, get_tokens
    def _get(email, password='testpass123'):
        res = api_client.post(reverse('login'), {
            'email': email,
            'password': password,
        })
        assert res.status_code == 200, f"Login failed: {res.data}"
        return res.data.get('tokens', {})
    return _get
