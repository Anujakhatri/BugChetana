import re


def clean_text(text: str) -> str:
    """
    jun text cleaning function training bela use gareko thiyo (train_severity_model.py ma),
    tehi exact cleaning logic inference/prediction time ma pani use garnu parcha.
    Model le yesto "cleaned" text herera patterns sikcha (severity predict garna).
    """
    if not isinstance(text, str):
        return ""
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s\-_/.]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text