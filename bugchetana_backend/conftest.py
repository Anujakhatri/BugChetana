import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from accounts.models import Role
from projects.models import Project, ProjectMember
from bugs.models import Bug

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def developer_role(db):
    return Role.objects.get_or_create(
        name='Developer', defaults={'description': 'Developer role'}
    )[0]


@pytest.fixture
def qa_role(db):
    return Role.objects.get_or_create(
        name='QA', defaults={'description': 'QA role'}
    )[0]


@pytest.fixture
def rm_role(db):
    return Role.objects.get_or_create(
        name='Release Manager', defaults={'description': 'Release Manager role'}
    )[0]


@pytest.fixture
def role(db, developer_role):
    return developer_role


@pytest.fixture
def role_developer(developer_role):
    return developer_role


@pytest.fixture
def make_user(db, developer_role):
    def _make_user(username, email, password='testpass123', role=None, is_staff=False, **kwargs):
        return User.objects.create_user(
            username=username,
            email=email,
            name=kwargs.pop('name', username),
            password=password,
            role=role or developer_role,
            is_staff=is_staff,
            **kwargs,
        )

    return _make_user


@pytest.fixture
def user(db, role):
    return User.objects.create_user(
        username="testuser",
        email="test@gmail.com",
        name="Test User",
        password="Test@1234",
        role=role,
    )


@pytest.fixture
def get_tokens(api_client):
    def _get(email, password='testpass123'):
        res = api_client.post(reverse('login'), {
            'email': email,
            'password': password,
        })
        assert res.status_code == 200, f"Login failed: {res.data}"
        return res.data.get('tokens', {})

    return _get


@pytest.fixture
def developer(db, developer_role):
    return User.objects.create_user(
        username='dev_user',
        email='dev@test.com',
        name='Dev User',
        password='testpass123',
        role=developer_role,
    )


@pytest.fixture
def qa_user(db, qa_role):
    return User.objects.create_user(
        username='qa_user',
        email='qa@test.com',
        name='QA User',
        password='testpass123',
        role=qa_role,
    )


@pytest.fixture
def release_manager(db, rm_role):
    return User.objects.create_user(
        username='rm_user',
        email='rm@test.com',
        name='RM User',
        password='testpass123',
        role=rm_role,
    )


@pytest.fixture
def project_with_members(db, developer, qa_user, release_manager):
    project = Project.objects.create(
        name='Test Project',
        release_manager=release_manager,
    )
    ProjectMember.objects.create(project=project, user=developer)
    ProjectMember.objects.create(project=project, user=qa_user)
    ProjectMember.objects.create(project=project, user=release_manager)
    return project


@pytest.fixture
def bug(db, project_with_members, developer):
    return Bug.objects.create(
        title='Test Bug',
        description='Something is broken',
        status='open',
        severity='medium',
        priority='high',
        project=project_with_members,
        created_by=developer,
    )


def auth_client(api_client, user):
    refresh = RefreshToken.for_user(user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return api_client


@pytest.fixture
def dev_client(api_client, developer):
    return auth_client(api_client, developer)


@pytest.fixture
def qa_client(api_client, qa_user):
    return auth_client(api_client, qa_user)


@pytest.fixture
def rm_client(api_client, release_manager):
    return auth_client(api_client, release_manager)
