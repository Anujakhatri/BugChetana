from unittest.mock import patch

import pytest
from rest_framework.test import APIRequestFactory, force_authenticate

from ai_integration.views import PredictSeverityView, GuestAIReviewView


@pytest.fixture
def factory():
    return APIRequestFactory()


@patch('ai_integration.views.predict_severity_with_confidence', return_value=('high', 0.35))
def test_predict_severity_includes_display_message_low_confidence(mock_predict, factory):
    request = factory.post(
        '/api/ai/predict-severity/',
        {'title': 'Crash', 'description': 'App crashes on launch'},
        format='json',
    )
    response = PredictSeverityView.as_view()(request)

    assert response.status_code == 200
    assert response.data['severity'] == 'high'
    assert response.data['confidence'] == 0.35
    assert response.data['display_message'] == (
        'Predicted: High (Low confidence — please review manually)'
    )


@patch('ai_integration.views.predict_severity_with_confidence', return_value=('medium', 0.72))
def test_predict_severity_includes_display_message_high_confidence(mock_predict, factory):
    request = factory.post(
        '/api/ai/predict-severity/',
        {'title': 'Typo', 'description': 'Minor label misalignment'},
        format='json',
    )
    response = PredictSeverityView.as_view()(request)

    assert response.status_code == 200
    assert response.data['display_message'] == 'Predicted: Medium'


@patch('ai_integration.views.suggest_fix', return_value='Check null guards in auth handler.')
@patch('ai_integration.views.generate_roast', return_value='This bug really knows how to make an entrance.')
def test_guest_review_works_without_authentication(mock_roast, mock_fix, factory):
    request = factory.post(
        '/api/ai/review-guest/',
        {
            'title': 'Login broken',
            'description': '500 error on submit',
            'severity': 'high',
        },
        format='json',
    )
    response = GuestAIReviewView.as_view()(request)

    assert response.status_code == 200
    assert response.data['roast'] == 'This bug really knows how to make an entrance.'
    assert response.data['fix_suggestions'] == 'Check null guards in auth handler.'
    mock_roast.assert_called_once()
    mock_fix.assert_called_once()


@patch('ai_integration.views.suggest_fix', return_value='Inspect validation rules.')
@patch('ai_integration.views.generate_roast', return_value='Roast text.')
def test_guest_review_ignores_authenticated_user(mock_roast, mock_fix, factory, make_user):
    user = make_user('dev1', 'dev1@example.com')
    request = factory.post(
        '/api/ai/review-guest/',
        {'title': 'Bug', 'description': 'Details'},
        format='json',
    )
    force_authenticate(request, user=user)
    response = GuestAIReviewView.as_view()(request)

    assert response.status_code == 200
    assert 'roast' in response.data
    assert 'fix_suggestions' in response.data
