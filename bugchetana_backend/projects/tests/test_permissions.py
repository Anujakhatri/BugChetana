import pytest
from django.urls import reverse
from projects.models import Project, ProjectMember


@pytest.mark.django_db
class TestProjectPermissions:

    # release_manager sees all projects
    def test_rm_sees_all_projects(self, api_client, make_user, rm_role, get_tokens):
        rm_user = make_user('rm', 'rm@test.com', role=rm_role)
        Project.objects.create(name='Project 1', release_manager=rm_user)
        Project.objects.create(name='Project 2', release_manager=rm_user)
        Project.objects.create(name='Project 3', release_manager=rm_user)

        tokens = get_tokens('rm@test.com')
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        res = api_client.get(reverse('projects-list-create'))
        assert res.status_code == 200
        assert len(res.data) == 3

    # developer sees only assigned projects
    def test_developer_sees_only_assigned_projects(self, api_client, make_user, rm_role, get_tokens):
        rm_user = make_user('rm', 'rm@test.com', role=rm_role)
        dev_user = make_user('dev', 'dev@test.com')

        assigned = Project.objects.create(name='Assigned', release_manager=rm_user)
        Project.objects.create(name='Not Assigned', release_manager=rm_user)
        ProjectMember.objects.create(project=assigned, user=dev_user)

        tokens = get_tokens('dev@test.com')
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        res = api_client.get(reverse('projects-list-create'))
        assert res.status_code == 200
        assert len(res.data) == 1
        assert res.data[0]['name'] == 'Assigned'

    # qa sees only assigned projects
    def test_qa_sees_only_assigned_projects(self, api_client, make_user, rm_role, qa_role, get_tokens):
        rm_user = make_user('rm', 'rm@test.com', role=rm_role)
        qa_user = make_user('qa', 'qa@test.com', role=qa_role)

        assigned = Project.objects.create(name='QA Project', release_manager=rm_user)
        Project.objects.create(name='Other Project', release_manager=rm_user)
        ProjectMember.objects.create(project=assigned, user=qa_user)

        tokens = get_tokens('qa@test.com')
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        res = api_client.get(reverse('projects-list-create'))
        assert res.status_code == 200
        assert len(res.data) == 1
        assert res.data[0]['name'] == 'QA Project'

    # unauthenticated request returns 401
    def test_unauthenticated_returns_401(self, api_client):
        res = api_client.get(reverse('projects-list-create'))
        assert res.status_code == 401

    # non-member cannot view project detail
    def test_non_member_cannot_view_detail(self, api_client, make_user, rm_role, get_tokens):
        rm_user = make_user('rm', 'rm@test.com', role=rm_role)
        dev_user = make_user('dev', 'dev@test.com')
        project = Project.objects.create(name='Secret Project', release_manager=rm_user)

        tokens = get_tokens('dev@test.com')
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        res = api_client.get(reverse('projects-detail', args=[project.id]))
        assert res.status_code == 403

    # project member can view detail
    def test_member_can_view_detail(self, api_client, make_user, rm_role, get_tokens):
        rm_user = make_user('rm', 'rm@test.com', role=rm_role)
        dev_user = make_user('dev', 'dev@test.com')
        project = Project.objects.create(name='Dev Project', release_manager=rm_user)
        ProjectMember.objects.create(project=project, user=dev_user)

        tokens = get_tokens('dev@test.com')
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        res = api_client.get(reverse('projects-detail', args=[project.id]))
        assert res.status_code == 200