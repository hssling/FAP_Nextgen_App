from __future__ import annotations

from datetime import datetime, timezone
import re

from .extractors import extract_text
from .safety import DISCLAIMER, enforce_safe_sections
from .state import update_job

SECTION_ORDER = [
    "description",
    "feelings",
    "evaluation",
    "analysis",
    "conclusion",
    "action_plan",
]

GENERIC_PATTERNS = ("good", "bad", "ok", "fine", "normal")
CONFIDENTIALITY_PATTERNS = (
    r"\b\d{10}\b",
    r"\b\d{12}\b",
    r"\bmrn\b",
    r"\baadhaar\b",
)


def process_job(job_id: str, file_path: str) -> None:
    update_job(job_id, status="processing")
    try:
        text = extract_text(file_path)
        result = _build_gibbs_result(text)
        update_job(
            job_id,
            status="completed",
            extracted_text=text,
            result=result,
            completed_at=datetime.now(timezone.utc),
        )
    except Exception as exc:
        update_job(
            job_id,
            status="failed",
            error=str(exc),
            completed_at=datetime.now(timezone.utc),
        )


def _build_gibbs_result(text: str) -> dict:
    paragraphs = [p.strip() for p in text.split("\n") if p.strip()]
    sections = {k: {"text": "", "evidence_spans": []} for k in SECTION_ORDER}

    for idx, paragraph in enumerate(paragraphs):
        target = SECTION_ORDER[min(idx, len(SECTION_ORDER) - 1)]
        prev = sections[target]["text"]
        sections[target]["text"] = f"{prev}\n{paragraph}".strip() if prev else paragraph

    for key in SECTION_ORDER:
        snippet = sections[key]["text"]
        if snippet:
            spans = _find_spans(text, snippet)
            sections[key]["evidence_spans"] = [{"start": s, "end": e} for s, e in spans]

    enforce_safe_sections([sections[k]["text"] for k in SECTION_ORDER])

    missing = [k for k in SECTION_ORDER if not sections[k]["text"]]
    too_short = [k for k in SECTION_ORDER if sections[k]["text"] and len(sections[k]["text"].split()) < 12]
    generic = [k for k in SECTION_ORDER if _is_generic(sections[k]["text"])]
    confidentiality = _find_confidentiality_flags(text)

    conf = {}
    for key in SECTION_ORDER:
        conf[key] = 0.0 if key in missing else 0.85

    return {
        "gibbs": sections,
        "quality_checks": {
            "missing_sections": missing,
            "too_short_sections": too_short,
            "generic_language_flags": generic,
            "confidentiality_flags": confidentiality,
        },
        "confidence": conf,
        "disclaimer": DISCLAIMER,
    }


def _find_spans(full_text: str, snippet: str) -> list[tuple[int, int]]:
    needle = snippet.strip()
    if not needle:
        return []
    start = full_text.find(needle)
    if start == -1:
        return []
    return [(start, start + len(needle))]


def _is_generic(text: str) -> bool:
    lower = (text or "").strip().lower()
    if not lower:
        return False
    return len(lower.split()) < 15 and any(token in lower for token in GENERIC_PATTERNS)


def _find_confidentiality_flags(text: str) -> list[str]:
    flags = []
    value = text or ""
    for pattern in CONFIDENTIALITY_PATTERNS:
        if re.search(pattern, value, flags=re.IGNORECASE):
            flags.append(f"Matched pattern: {pattern}")
    return flags
