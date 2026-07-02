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
    """
    Predict bug severity from title + description.

    Returns a lowercase string matching Bug.SEVERITY_CHOICES:
    'low' | 'medium' | 'high' | 'critical'.

    Raises RuntimeError / ValueError on failure — this function does NOT
    silently fall back. The caller (BugListCreateView) decides what the
    fallback should be.
    """
    if _model is None or _vectorizer is None or _label_encoder is None:
        raise RuntimeError(f"ML model artifacts not loaded: {_load_error}")

    text = clean_text(f"{title} {description}")
    if not text:
        raise ValueError("Empty title/description after cleaning — nothing to predict on")

    vector = _vectorizer.transform([text])
    prediction = _model.predict(vector)
    label = _label_encoder.inverse_transform(prediction)[0]  # e.g. 'High'

    return label.lower()