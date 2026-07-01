import pytest

pytestmark = pytest.mark.django_db
import pytest
from rest_framework.test import APIClient
from django.urls import reverse
from projects.models import Project, ProjectMember
from bugs.models import Bug

pytestmark = pytest.mark.django_db


@pytest.fixture
def rm_user(make_user, rm_role):
    return make_user("rm_user", "rm@test.com", role=rm_role)


@pytest.fixture
def qa_user(make_user, qa_role):
    return make_user("qa_user", "qa@test.com", role=qa_role)


@pytest.fixture
def dev_user(make_user, developer_role):
    return make_user("dev_user", "dev@test.com", role=developer_role)


@pytest.fixture
def dev_user2(make_user, developer_role):
    return make_user("dev_user2", "dev2@test.com", role=developer_role)


@pytest.fixture
def non_member_dev(make_user, developer_role):
    return make_user("non_member", "non_member@test.com", role=developer_role)


@pytest.fixture
def token_project(rm_user):
    return Project.objects.create(name="Test Project", release_manager=rm_user)


@pytest.fixture
def setup_members(token_project, qa_user, dev_user, dev_user2):
    ProjectMember.objects.create(project=token_project, user=qa_user)
    ProjectMember.objects.create(project=token_project, user=dev_user)
    ProjectMember.objects.create(project=token_project, user=dev_user2)


@pytest.fixture
def token_bug(token_project, dev_user):
    return Bug.objects.create(
        title="Test Bug",
        description="A bug",
        project=token_project,
        created_by=dev_user,
        assigned_to=dev_user,
        status="open",
        severity="medium"
    )


def test_non_member_cannot_access_project_bugs(api_client, non_member_dev, token_project, get_tokens):
    tokens = get_tokens(non_member_dev.email)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

    url = reverse('bug-list-create', kwargs={'project_id': token_project.id})
    response = api_client.get(url)
    assert response.status_code == 403


def test_dev_member_can_create_bug(api_client, dev_user, token_project, setup_members, get_tokens):
    tokens = get_tokens(dev_user.email)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

    url = reverse('bug-list-create', kwargs={'project_id': token_project.id})
    data = {
        "title": "New Bug",
        "description": "Bug description",
        "priority": "high"
    }
    response = api_client.post(url, data)
    assert response.status_code == 201
    assert response.data['title'] == "New Bug"


def test_qa_member_cannot_create_bug(api_client, qa_user, token_project, setup_members, get_tokens):
    tokens = get_tokens(qa_user.email)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

    url = reverse('bug-list-create', kwargs={'project_id': token_project.id})
    data = {
        "title": "New Bug",
        "description": "Bug description",
        "priority": "high"
    }
    response = api_client.post(url, data)
    assert response.status_code == 403


def test_dev_member_can_list_assigned_bugs(api_client, dev_user, token_project, setup_members, token_bug, get_tokens):
    tokens = get_tokens(dev_user.email)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

    url = reverse('bug-list-create', kwargs={'project_id': token_project.id})
    response = api_client.get(url)
    assert response.status_code == 200
    assert len(response.data['results']) == 1 if 'results' in response.data else len(response.data) > 0


def test_dev_member_cannot_list_unassigned_bugs(api_client, dev_user2, token_project, setup_members, token_bug, get_tokens):
    tokens = get_tokens(dev_user2.email)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

    url = reverse('bug-list-create', kwargs={'project_id': token_project.id})
    response = api_client.get(url)
    assert response.status_code == 200
    # Dev 2 is not assigned to the bug
    results = response.data['results'] if 'results' in response.data else response.data
    assert len(results) == 0


def test_qa_can_list_all_bugs(api_client, qa_user, token_project, setup_members, token_bug, get_tokens):
    tokens = get_tokens(qa_user.email)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

    url = reverse('bug-list-create', kwargs={'project_id': token_project.id})
    response = api_client.get(url)
    assert response.status_code == 200
    results = response.data['results'] if 'results' in response.data else response.data
    assert len(results) == 1


def test_qa_can_resolve_qa_result(api_client, qa_user, token_project, setup_members, token_bug, get_tokens):
    # QA result requires bug to be 'resolved'
    token_bug.status = 'resolved'
    token_bug.save()

    tokens = get_tokens(qa_user.email)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

    url = reverse('qa-result', kwargs={'bug_id': token_bug.id})
    data = {
        "result": "pass",
        "notes": "Looks good"
    }
    response = api_client.post(url, data)
    assert response.status_code == 201

    token_bug.refresh_from_db()
    assert token_bug.status == 'closed'
    assert token_bug.verified_by == qa_user


def test_dev_cannot_resolve_qa_result(api_client, dev_user, token_project, setup_members, token_bug, get_tokens):
    token_bug.status = 'resolved'
    token_bug.save()

    tokens = get_tokens(dev_user.email)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

    url = reverse('qa-result', kwargs={'bug_id': token_bug.id})
    data = {
        "result": "pass"
    }
    response = api_client.post(url, data)
    assert response.status_code == 403


def test_dashboard_summary_view(api_client, rm_user, token_project, setup_members, token_bug, get_tokens):
    tokens = get_tokens(rm_user.email)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

    url = reverse('dashboard-summary', kwargs={'project_id': token_project.id})
    response = api_client.get(url)

    assert response.status_code == 200
    assert response.data['total_bugs'] == 1
    assert response.data['open_bugs'] == 1
    assert response.data['resolved_bugs'] == 0
    assert response.data['severity_breakdown'] == {'medium': 1}


class TestBugCreate:
    def test_developer_can_create_bug(self, dev_client, project_with_members):
        response = dev_client.post(
            f'/api/projects/{project_with_members.id}/bugs/',
            {
                'title': 'New Bug',
                'description': 'Something broke badly',
                'severity': 'high',
                'priority': 'high'
            }
        )
        assert response.status_code == 201
        assert response.data['title'] == 'New Bug'

    def test_qa_cannot_create_bug(self, qa_client, project_with_members):
        response = qa_client.post(
            f'/api/projects/{project_with_members.id}/bugs/',
            {
                'title': 'QA Bug Attempt',
                'description': 'QA should not create bugs',
                'severity': 'low',
                'priority': 'low'
            }
        )
        assert response.status_code == 403

    def test_rm_cannot_create_bug(self, rm_client, project_with_members):
        response = rm_client.post(
            f'/api/projects/{project_with_members.id}/bugs/',
            {
                'title': 'RM Bug Attempt',
                'description': 'RM should not create bugs',
                'severity': 'low',
                'priority': 'low'
            }
        )
        assert response.status_code == 403

    def test_unauthenticated_cannot_create_bug(self, api_client, project_with_members):
        response = api_client.post(
            f'/api/projects/{project_with_members.id}/bugs/',
            {'title': 'Unauth Bug', 'description': 'No token'}
        )
        assert response.status_code == 401


class TestBugList:
    def test_developer_sees_only_assigned_bugs(
        self, dev_client, project_with_members, developer, bug
    ):
        # bug is not assigned to developer yet
        response = dev_client.get(f'/api/projects/{project_with_members.id}/bugs/')
        assert response.status_code == 200
        # developer created it but not assigned — should be empty
        assert len(response.data) == 0

    def test_qa_sees_all_bugs(self, qa_client, project_with_members, bug):
        response = qa_client.get(f'/api/projects/{project_with_members.id}/bugs/')
        assert response.status_code == 200
        assert len(response.data) == 1

    def test_rm_sees_all_bugs(self, rm_client, project_with_members, bug):
        response = rm_client.get(f'/api/projects/{project_with_members.id}/bugs/')
        assert response.status_code == 200
        assert len(response.data) == 1


class TestBugUpdate:
    def test_developer_can_update_own_bug(self, dev_client, bug):
        response = dev_client.patch(
            f'/api/bugs/{bug.id}/',
            {'status': 'in_progress'}
        )
        assert response.status_code == 200
        assert response.data['status'] == 'in_progress'

    def test_non_member_cannot_update_bug(self, api_client, bug, role_developer, db):
        from django.contrib.auth import get_user_model
        from rest_framework_simplejwt.tokens import RefreshToken
        User = get_user_model()

        # Project member hoina yo user
        outsider = User.objects.create_user(
            username='outsider',
            email='outsider@test.com',
            name='Outsider',
            password='testpass123',
            role=role_developer
        )
        refresh = RefreshToken.for_user(outsider)
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

        response = api_client.patch(f'/api/bugs/{bug.id}/', {'status': 'resolved'})
        assert response.status_code == 403