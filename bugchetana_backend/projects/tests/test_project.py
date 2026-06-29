import pytest
from django.urls import reverse


@pytest.mark.django_db
class TestProjectListCreateView:

    # release_manager can create a project
    def test_rm_can_create_project(self, api_client, make_user, rm_role, get_tokens):
        rm_user = make_user('rm', 'rm@test.com', role=rm_role)
        tokens = get_tokens('rm@test.com')
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        res = api_client.post(reverse('projects-list-create'), {'name': 'Project Alpha'})
        assert res.status_code == 201
        assert res.data['name'] == 'Project Alpha'

    # release_manager can list all projects
    def test_rm_can_list_all_projects(self, api_client, make_user, rm_role, get_tokens):
        rm_user = make_user('rm', 'rm@test.com', role=rm_role)
        tokens = get_tokens('rm@test.com')
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        api_client.post(reverse('projects-list-create'), {'name': 'Project A'})
        api_client.post(reverse('projects-list-create'), {'name': 'Project B'})

        res = api_client.get(reverse('projects-list-create'))
        assert res.status_code == 200
        assert len(res.data) == 2

    # developer cannot create a project
    def test_developer_cannot_create_project(self, api_client, make_user, get_tokens):
        make_user('dev', 'dev@test.com')
        tokens = get_tokens('dev@test.com')
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        res = api_client.post(reverse('projects-list-create'), {'name': 'Project Beta'})
        assert res.status_code == 403

    # qa cannot create a project
    def test_qa_cannot_create_project(self, api_client, make_user, qa_role, get_tokens):
        make_user('qa', 'qa@test.com', role=qa_role)
        tokens = get_tokens('qa@test.com')
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        res = api_client.post(reverse('projects-list-create'), {'name': 'Project Gamma'})
        assert res.status_code == 403

    # unauthenticated user cannot access projects
    def test_unauthenticated_cannot_access_projects(self, api_client):
        res = api_client.get(reverse('projects-list-create'))
        assert res.status_code == 401

    # developer can only see assigned projects
    def test_developer_sees_only_assigned_projects(self, api_client, make_user, rm_role, get_tokens):
        from projects.models import Project, ProjectMember

        rm_user = make_user('rm', 'rm@test.com', role=rm_role)
        dev_user = make_user('dev', 'dev@test.com')

        project1 = Project.objects.create(name='Assigned Project', release_manager=rm_user)
        project2 = Project.objects.create(name='Unassigned Project', release_manager=rm_user)
        ProjectMember.objects.create(project=project1, user=dev_user)

        tokens = get_tokens('dev@test.com')
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        res = api_client.get(reverse('projects-list-create'))
        assert res.status_code == 200
        assert len(res.data) == 1
        assert res.data[0]['name'] == 'Assigned Project'


@pytest.mark.django_db
class TestProjectDetailView:

    # release_manager can update a project
    def test_rm_can_update_project(self, api_client, make_user, rm_role, get_tokens):
        from projects.models import Project

        rm_user = make_user('rm', 'rm@test.com', role=rm_role)
        project = Project.objects.create(name='Old Name', release_manager=rm_user)

        tokens = get_tokens('rm@test.com')
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        res = api_client.patch(reverse('projects-detail', args=[project.id]), {'name': 'New Name'})
        assert res.status_code == 200
        assert res.data['name'] == 'New Name'

    # release_manager can delete a project
    def test_rm_can_delete_project(self, api_client, make_user, rm_role, get_tokens):
        from projects.models import Project

        rm_user = make_user('rm', 'rm@test.com', role=rm_role)
        project = Project.objects.create(name='To Delete', release_manager=rm_user)

        tokens = get_tokens('rm@test.com')
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        res = api_client.delete(reverse('projects-detail', args=[project.id]))
        assert res.status_code == 204

    # project member can view project detail
    def test_member_can_view_project_detail(self, api_client, make_user, rm_role, get_tokens):
        from projects.models import Project, ProjectMember

        rm_user = make_user('rm', 'rm@test.com', role=rm_role)
        dev_user = make_user('dev', 'dev@test.com')
        project = Project.objects.create(name='Dev Project', release_manager=rm_user)
        ProjectMember.objects.create(project=project, user=dev_user)

        tokens = get_tokens('dev@test.com')
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        res = api_client.get(reverse('projects-detail', args=[project.id]))
        assert res.status_code == 200

    # non-member cannot view project detail
    def test_non_member_cannot_view_project_detail(self, api_client, make_user, rm_role, get_tokens):
        from projects.models import Project

        rm_user = make_user('rm', 'rm@test.com', role=rm_role)
        dev_user = make_user('dev', 'dev@test.com')
        project = Project.objects.create(name='Private Project', release_manager=rm_user)

        tokens = get_tokens('dev@test.com')
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        res = api_client.get(reverse('projects-detail', args=[project.id]))
        assert res.status_code == 403