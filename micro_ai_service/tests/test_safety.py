from app.safety import has_disallowed_medical_claims


def test_disallowed_claim_detected():
    assert has_disallowed_medical_claims("This is definitely malaria.")


def test_neutral_text_not_blocked():
    assert not has_disallowed_medical_claims("This may suggest a febrile illness and needs review.")
