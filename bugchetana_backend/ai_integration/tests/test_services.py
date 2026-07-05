from ai_integration.services import (
    build_severity_display_message,
    build_prediction_response,
    LOW_CONFIDENCE_THRESHOLD,
)


def test_display_message_low_confidence():
    msg = build_severity_display_message('high', LOW_CONFIDENCE_THRESHOLD - 0.01)
    assert msg == 'Predicted: High (Low confidence — please review manually)'


def test_display_message_at_threshold():
    msg = build_severity_display_message('medium', LOW_CONFIDENCE_THRESHOLD)
    assert msg == 'Predicted: Medium'


def test_display_message_high_confidence():
    msg = build_severity_display_message('critical', 0.91)
    assert msg == 'Predicted: Critical'


def test_build_prediction_response_includes_all_fields():
    payload = build_prediction_response('low', 0.42)
    assert payload == {
        'severity': 'low',
        'confidence': 0.42,
        'display_message': 'Predicted: Low (Low confidence — please review manually)',
    }
