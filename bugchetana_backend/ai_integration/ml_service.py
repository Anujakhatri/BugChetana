from pathlib import Path
import joblib

from .text_utils import clean_text

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "ml_models"

# Yo code module import huda euta choti matra run huncha, NOT inside
# predict_severity(), bhitra load gareko bhaye, every single API request ma disk I/O huthiyo (slow + wasteful).
_model = None
_vectorizer = None
_label_encoder = None
_load_error = None

try:
    _model = joblib.load(MODEL_DIR / "model.pkl")
    _vectorizer = joblib.load(MODEL_DIR / "vectorizer.pkl")
    _label_encoder = joblib.load(MODEL_DIR / "label_encoder.pkl")
except Exception as e:
    # Don't crash the whole app if artifacts are missing/corrupted.
    # predict_severity() will raise runtime error and individual request fail huncha, tara server chaldai basxa.
    _load_error = e


def predict_severity(title: str, description: str) -> str:
    """Return predicted severity label only. See predict_severity_with_confidence."""
    severity, _confidence = predict_severity_with_confidence(title, description)
    return severity


def predict_severity_with_confidence(title: str, description: str) -> tuple[str, float]:
    """
    Predict bug severity from title + description.

    Returns (severity, confidence) where severity is a lowercase string matching
    Bug.SEVERITY_CHOICES and confidence is the model's max class probability (0–1).

    Raises RuntimeError / ValueError on failure — this function does NOT
    silently fall back. The caller decides what the fallback should be.
    """
    if _model is None or _vectorizer is None or _label_encoder is None:
        raise RuntimeError(f"ML model artifacts not loaded: {_load_error}")

    text = clean_text(f"{title} {description}")
    if not text:
        raise ValueError("Empty title/description after cleaning — nothing to predict on")

    vector = _vectorizer.transform([text])
    prediction = _model.predict(vector)
    label = _label_encoder.inverse_transform(prediction)[0]  # e.g. 'High'

    confidence = 0.0
    if hasattr(_model, 'predict_proba'):
        proba = _model.predict_proba(vector)[0]
        confidence = float(max(proba))

    return label.lower(), round(confidence, 4)