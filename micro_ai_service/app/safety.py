from __future__ import annotations

import re
from typing import Iterable


DISCLAIMER = (
    "Decision-support only. Confirm with a qualified clinician. "
    "This output is not a diagnosis."
)

DISALLOWED_DIAGNOSIS_PATTERNS: tuple[str, ...] = (
    r"\bdefinitive diagnosis\b",
    r"\bconfirmed diagnosis\b",
    r"\byou have\b",
    r"\bthis is definitely\b",
)


def has_disallowed_medical_claims(text: str) -> bool:
    s = (text or "").lower()
    return any(re.search(pattern, s) for pattern in DISALLOWED_DIAGNOSIS_PATTERNS)


def enforce_safe_sections(values: Iterable[str]) -> None:
    joined = "\n".join(values)
    if has_disallowed_medical_claims(joined):
        raise ValueError("Blocked unsafe output: definitive diagnosis style claim detected.")

