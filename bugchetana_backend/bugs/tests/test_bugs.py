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
def project(rm_user):
    return Project.objects.create(name="Test Project", release_manager=rm_user)

@pytest.fixture
def setup_members(project, qa_user, dev_user, dev_user2):
    ProjectMember.objects.create(project=project, user=qa_user)
    ProjectMember.objects.create(project=project, user=dev_user)
    ProjectMember.objects.create(project=project, user=dev_user2)

@pytest.fixture
def bug(project, dev_user):
    return Bug.objects.create(
        title="Test Bug",
        description="A bug",
        project=project,
        created_by=dev_user,
        assigned_to=dev_user,
        status="open",
        severity="medium"
    )

def test_non_member_cannot_access_project_bugs(api_client, non_member_dev, project, get_tokens):
    tokens = get_tokens(non_member_dev.email)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
    
    url = reverse('bug-list-create', kwargs={'project_id': project.id})
    response = api_client.get(url)
    assert response.status_code == 403

def test_dev_member_can_create_bug(api_client, dev_user, project, setup_members, get_tokens):
    tokens = get_tokens(dev_user.email)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
    
    url = reverse('bug-list-create', kwargs={'project_id': project.id})
    data = {
        "title": "New Bug",
        "description": "Bug description",
        "priority": "high"
    }
    response = api_client.post(url, data)
    assert response.status_code == 201
    assert response.data['title'] == "New Bug"
    
def test_qa_cannot_create_bug(api_client, qa_user, project, setup_members, get_tokens):
    tokens = get_tokens(qa_user.email)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
    
    url = reverse('bug-list-create', kwargs={'project_id': project.id})
    data = {
        "title": "New Bug",
        "description": "Bug description",
        "priority": "high"
    }
    response = api_client.post(url, data)
    # QA is not IsDeveloper, should get 403
    assert response.status_code == 403

def test_dev_member_can_list_assigned_bugs(api_client, dev_user, project, setup_members, bug, get_tokens):
    tokens = get_tokens(dev_user.email)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
    
    url = reverse('bug-list-create', kwargs={'project_id': project.id})
    response = api_client.get(url)
    assert response.status_code == 200
    assert len(response.data['results']) == 1 if 'results' in response.data else len(response.data) > 0

def test_dev_member_cannot_list_unassigned_bugs(api_client, dev_user2, project, setup_members, bug, get_tokens):
    tokens = get_tokens(dev_user2.email)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
    
    url = reverse('bug-list-create', kwargs={'project_id': project.id})
    response = api_client.get(url)
    assert response.status_code == 200
    # Dev 2 is not assigned to the bug
    results = response.data['results'] if 'results' in response.data else response.data
    assert len(results) == 0

def test_qa_can_list_all_bugs(api_client, qa_user, project, setup_members, bug, get_tokens):
    tokens = get_tokens(qa_user.email)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
    
    url = reverse('bug-list-create', kwargs={'project_id': project.id})
    response = api_client.get(url)
    assert response.status_code == 200
    results = response.data['results'] if 'results' in response.data else response.data
    assert len(results) == 1

def test_qa_can_resolve_qa_result(api_client, qa_user, project, setup_members, bug, get_tokens):
    # QA result requires bug to be 'resolved'
    bug.status = 'resolved'
    bug.save()
    
    tokens = get_tokens(qa_user.email)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
    
    url = reverse('qa-result', kwargs={'bug_id': bug.id})
    data = {
        "result": "pass",
        "notes": "Looks good"
    }
    response = api_client.post(url, data)
    assert response.status_code == 201
    
    bug.refresh_from_db()
    assert bug.status == 'closed'
    assert bug.verified_by == qa_user

def test_dev_cannot_resolve_qa_result(api_client, dev_user, project, setup_members, bug, get_tokens):
    bug.status = 'resolved'
    bug.save()
    
    tokens = get_tokens(dev_user.email)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
    
    url = reverse('qa-result', kwargs={'bug_id': bug.id})
    data = {
        "result": "pass"
    }
    response = api_client.post(url, data)
    assert response.status_code == 403

def test_dashboard_summary_view(api_client, rm_user, project, setup_members, bug, get_tokens):
    tokens = get_tokens(rm_user.email)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
    
    url = reverse('dashboard-summary', kwargs={'project_id': project.id})
    response = api_client.get(url)
    
    assert response.status_code == 200
    assert response.data['total_bugs'] == 1
    assert response.data['open_bugs'] == 1
    assert response.data['resolved_bugs'] == 0
    assert response.data['severity_breakdown'] == {'medium': 1}

