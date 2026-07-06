LOW_CONFIDENCE_THRESHOLD = 0.5


def build_severity_display_message(severity: str, confidence: float) -> str:
    label = severity.capitalize() if severity else severity
    pct = int(round(confidence * 100))
    if confidence < LOW_CONFIDENCE_THRESHOLD:
        return f"Predicted: {label} ({pct}% confidence — please review manually)"
    return f"Predicted: {label} ({pct}%)"


def build_prediction_response(severity: str, confidence: float) -> dict:
    return {
        'severity': severity,
        'confidence': confidence,
        'display_message': build_severity_display_message(severity, confidence),
    }
