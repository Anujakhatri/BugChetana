import pytest
from unittest.mock import patch

from ai_integration import ml_service


def test_predict_severity_returns_valid_choice():
    result = ml_service.predict_severity(
        "Login fails with 500 error.txt",
        "Users cannot log in, server returns 500 internal server error.txt on every attempt.",
    )
    assert result in ('low', 'medium', 'high', 'critical')


def test_predict_severity_raises_on_empty_text():
    with pytest.raises(ValueError):
        ml_service.predict_severity("", "")


def test_predict_severity_raises_when_model_not_loaded():
    with patch.object(ml_service, '_model', None):
        with pytest.raises(RuntimeError):
            ml_service.predict_severity("Some bug", "Some description")