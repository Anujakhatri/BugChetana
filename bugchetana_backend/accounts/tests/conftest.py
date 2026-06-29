import pytest

@pytest.fixture
def auth_client(api_client, user):
    response = api_client.post('/api/auth/login/', {
        "email": "test@gmail.com",
        "password": "Test@1234"
    })
    token = response.data['tokens']['access']
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return api_client, response.data['tokens']['refresh']