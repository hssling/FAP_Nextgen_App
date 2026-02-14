from __future__ import annotations

from pathlib import Path
import json
import unicodedata

import pdfplumber
from docx import Document
from PIL import Image
import pytesseract
from pypdf import PdfReader


TEXT_EXTS = {".txt", ".md", ".csv", ".json"}
IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp"}


def _normalize_text(value: str) -> str:
    base = (value or "").replace("\r\n", "\n").replace("\x00", " ").strip()
    return unicodedata.normalize("NFC", base)


def extract_text(path: str) -> str:
    p = Path(path)
    ext = p.suffix.lower()

    if ext in TEXT_EXTS:
        return _normalize_text(p.read_text(encoding="utf-8", errors="ignore"))

    if ext == ".docx":
        doc = Document(str(p))
        lines = [para.text for para in doc.paragraphs if para.text]
        return _normalize_text("\n".join(lines))

    if ext == ".pdf":
        txt = _extract_pdf_text(str(p))
        if txt:
            return _normalize_text(txt)
        return _normalize_text(_extract_pdf_ocr_text(str(p)))

    if ext in IMAGE_EXTS:
        img = Image.open(str(p))
        return _normalize_text(pytesseract.image_to_string(img, lang="eng+hin+kan"))

    if ext == ".json":
        data = json.loads(p.read_text(encoding="utf-8", errors="ignore"))
        return _normalize_text(json.dumps(data, ensure_ascii=False))

    return _normalize_text(p.read_text(encoding="utf-8", errors="ignore"))


def _extract_pdf_text(path: str) -> str:
    chunks: list[str] = []
    try:
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                t = page.extract_text() or ""
                if t.strip():
                    chunks.append(t)
    except Exception:
        chunks = []

    if chunks:
        return "\n\n".join(chunks)

    reader = PdfReader(path)
    parts = []
    for page in reader.pages:
        parts.append(page.extract_text() or "")
    return "\n\n".join([p for p in parts if p.strip()])


def _extract_pdf_ocr_text(path: str) -> str:
    # Placeholder for advanced scanned PDF OCR pipeline.
    # Current baseline returns empty if no native text is found.
    return ""
