import pytest
from django.urls import reverse
from projects.models import Project, ProjectMember


@pytest.mark.django_db
class TestAddProjectMemberView:

    # release_manager can add a member
    def test_rm_can_add_member(self, api_client, make_user, rm_role, get_tokens):
        rm_user = make_user('rm', 'rm@test.com', role=rm_role)
        dev_user = make_user('dev', 'dev@test.com')
        project = Project.objects.create(name='Project A', release_manager=rm_user)

        tokens = get_tokens('rm@test.com')
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        res = api_client.post(
            reverse('add-member', args=[project.id]),
            {'user_id': dev_user.id}
        )
        assert res.status_code == 201
        assert ProjectMember.objects.filter(project=project, user=dev_user).exists()

    # developer cannot add a member
    def test_developer_cannot_add_member(self, api_client, make_user, rm_role, get_tokens):
        rm_user = make_user('rm', 'rm@test.com', role=rm_role)
        dev1 = make_user('dev1', 'dev1@test.com')
        dev2 = make_user('dev2', 'dev2@test.com')
        project = Project.objects.create(name='Project B', release_manager=rm_user)

        tokens = get_tokens('dev1@test.com')
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        res = api_client.post(
            reverse('add-member', args=[project.id]),
            {'user_id': dev2.id}
        )
        assert res.status_code == 403

    # qa cannot add a member
    def test_qa_cannot_add_member(self, api_client, make_user, rm_role, qa_role, get_tokens):
        rm_user = make_user('rm', 'rm@test.com', role=rm_role)
        qa_user = make_user('qa', 'qa@test.com', role=qa_role)
        dev_user = make_user('dev', 'dev@test.com')
        project = Project.objects.create(name='Project C', release_manager=rm_user)

        tokens = get_tokens('qa@test.com')
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        res = api_client.post(
            reverse('add-member', args=[project.id]),
            {'user_id': dev_user.id}
        )
        assert res.status_code == 403

    # adding member to non-existent project returns 404
    def test_add_member_to_nonexistent_project(self, api_client, make_user, rm_role, get_tokens):
        rm_user = make_user('rm', 'rm@test.com', role=rm_role)
        dev_user = make_user('dev', 'dev@test.com')

        tokens = get_tokens('rm@test.com')
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        res = api_client.post(
            reverse('add-member', args=[9999]),
            {'user_id': dev_user.id}
        )
        assert res.status_code == 404

    # duplicate member cannot be added
    def test_cannot_add_duplicate_member(self, api_client, make_user, rm_role, get_tokens):
        rm_user = make_user('rm', 'rm@test.com', role=rm_role)
        dev_user = make_user('dev', 'dev@test.com')
        project = Project.objects.create(name='Project D', release_manager=rm_user)
        ProjectMember.objects.create(project=project, user=dev_user)

        tokens = get_tokens('rm@test.com')
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        res = api_client.post(
            reverse('add-member', args=[project.id]),
            {'user_id': dev_user.id}
        )
        assert res.status_code == 400


@pytest.mark.django_db
class TestRemoveProjectMemberView:

    # release_manager can remove a member
    def test_rm_can_remove_member(self, api_client, make_user, rm_role, get_tokens):
        rm_user = make_user('rm', 'rm@test.com', role=rm_role)
        dev_user = make_user('dev', 'dev@test.com')
        project = Project.objects.create(name='Project E', release_manager=rm_user)
        ProjectMember.objects.create(project=project, user=dev_user)

        tokens = get_tokens('rm@test.com')
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        res = api_client.delete(
            reverse('remove-member', args=[project.id, dev_user.id])
        )
        assert res.status_code == 200
        assert not ProjectMember.objects.filter(project=project, user=dev_user).exists()

    # developer cannot remove a member
    def test_developer_cannot_remove_member(self, api_client, make_user, rm_role, get_tokens):
        rm_user = make_user('rm', 'rm@test.com', role=rm_role)
        dev1 = make_user('dev1', 'dev1@test.com')
        dev2 = make_user('dev2', 'dev2@test.com')
        project = Project.objects.create(name='Project F', release_manager=rm_user)
        ProjectMember.objects.create(project=project, user=dev2)

        tokens = get_tokens('dev1@test.com')
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        res = api_client.delete(
            reverse('remove-member', args=[project.id, dev2.id])
        )
        assert res.status_code == 403

    # removing non-existent member returns 404
    def test_remove_nonexistent_member(self, api_client, make_user, rm_role, get_tokens):
        rm_user = make_user('rm', 'rm@test.com', role=rm_role)
        dev_user = make_user('dev', 'dev@test.com')
        project = Project.objects.create(name='Project G', release_manager=rm_user)

        tokens = get_tokens('rm@test.com')
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        res = api_client.delete(
            reverse('remove-member', args=[project.id, dev_user.id])
        )
        assert res.status_code == 404