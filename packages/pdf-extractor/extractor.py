from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Iterable, List

import fitz  # PyMuPDF
import pandas as pd

from models import FieldArea


NORMALIZE_OPTIONS = ["raw", "int", "float", "date_ymd", "compact"]
MODE_OPTIONS = ["text"]


def clean_text(value: str, normalize: str = "raw") -> str:
    value = (value or "").replace("\n", " ").replace("\r", " ")
    value = re.sub(r"\s+", " ", value).strip()

    if normalize == "int":
        return re.sub(r"[^0-9\-]", "", value)
    if normalize == "float":
        cleaned = re.sub(r"[^0-9.\-]", "", value)
        # Avoid repeated decimal points like 1.234.56
        if cleaned.count(".") > 1:
            first = cleaned.find(".")
            cleaned = cleaned[: first + 1] + cleaned[first + 1 :].replace(".", "")
        return cleaned
    if normalize == "compact":
        return re.sub(r"\s+", "", value)
    if normalize == "date_ymd":
        digits = re.sub(r"[^0-9]", "", value)
        if len(digits) == 8:
            return f"{digits[0:4]}-{digits[4:6]}-{digits[6:8]}"
        return digits
    return value


def clip_rect(x0: float, y0: float, x1: float, y1: float) -> fitz.Rect:
    left = min(x0, x1)
    right = max(x0, x1)
    top = min(y0, y1)
    bottom = max(y0, y1)
    return fitz.Rect(left, top, right, bottom)


def extract_text_from_area(page: fitz.Page, area: FieldArea) -> str:
    rect = clip_rect(area.x0, area.y0, area.x1, area.y1)
    text = page.get_text("text", clip=rect)
    return clean_text(text, area.normalize)


def extract_record(doc: fitz.Document, fields: Iterable[FieldArea]) -> dict:
    row = {}
    for area in fields:
        page = doc[area.page_index]
        row[area.field_name] = extract_text_from_area(page, area)
    return row


def extract_dataframe(pdf_bytes: bytes, fields: List[FieldArea], each_page: bool = False) -> pd.DataFrame:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        if each_page:
            rows = []
            for page_index in range(len(doc)):
                per_page = []
                for area in fields:
                    cloned = FieldArea(**area.to_dict())
                    cloned.page_index = page_index
                    per_page.append(cloned)
                row = extract_record(doc, per_page)
                row["source_page"] = page_index + 1
                rows.append(row)
            return pd.DataFrame(rows)

        row = extract_record(doc, fields)
        return pd.DataFrame([row])
    finally:
        doc.close()


def save_layout(path: str | Path, fields: List[FieldArea]) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps([f.to_dict() for f in fields], ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def load_layout(path: str | Path) -> List[FieldArea]:
    path = Path(path)
    if not path.exists():
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    return [FieldArea.from_dict(item) for item in data]
