"""Reference parser/writer for WhatsApp -> Google Sheet ingest.

This module is intentionally pure and side-effect free so the same logic can be
ported into a Google Apps Script webhook without relying on positional columns.
"""

from __future__ import annotations

import re
from typing import Dict, Iterable, List, Optional

FIXED_SCHEMA: List[str] = [
    "timestamp",
    "weight",
    "gender",
    "board",
    "board_size",
    "level",
    "kite_size",
    "wind",
    "brand",
    "model",
    "location",
    "water",
    "result",
    "note",
]

LABEL_TO_FIELD: Dict[str, str] = {
    "Weight (kg)": "weight",
    "Gender": "gender",
    "Board type": "board",
    "Board size": "board_size",
    "Level": "level",
    "Kite (m²)": "kite_size",
    "Kite size (m²)": "kite_size",
    "Wind (kts)": "wind",
    "Wind": "wind",
    "Brand": "brand",
    "Model": "model",
    "Spot": "location",
    "Water conditions": "water",
    "Session result": "result",
    "Notes": "note",
    "Note": "note",
}

HEADER_ALIASES: Dict[str, str] = {
    "timestamp": "timestamp",
    "weight": "weight",
    "gender": "gender",
    "board": "board",
    "board_size": "board_size",
    "board size": "board_size",
    "level": "level",
    "kite_size": "kite_size",
    "kite size": "kite_size",
    "wind": "wind",
    "brand": "brand",
    "model": "model",
    "location": "location",
    "water": "water",
    "result": "result",
    "note": "note",
    "notes": "note",
}

TECHNICAL_BLOCK_RE = re.compile(
    r"\n---\nID:\s*(?P<id>[a-z0-9]{10})\nTS:\s*(?P<ts>[^\n]+)\nSRC:\s*(?P<src>[^\n]+)\nSIG:\s*(?P<sig>[a-f0-9]{10})\n---\s*\Z"
)


def _blank_record() -> Dict[str, Optional[str]]:
    return {field: None for field in FIXED_SCHEMA}


def _split_message_and_technical_block(raw_text: str) -> tuple[str, Optional[str]]:
    text = str(raw_text or "").strip()
    match = TECHNICAL_BLOCK_RE.search(text)
    if not match:
        return text, None
    core_text = text[: match.start()].rstrip()
    return core_text, match.group("ts").strip()


def _normalize_label(label: str) -> str:
    stripped = re.sub(r"^[^A-Za-z]+", "", str(label or ""))
    return re.sub(r"\s+", " ", stripped).strip()


def _normalize_header(header: str) -> Optional[str]:
    compact = re.sub(r"[_\s]+", " ", str(header or "").strip().lower())
    return HEADER_ALIASES.get(compact)


def _normalize_gender(value: str) -> Optional[str]:
    normalized = str(value or "").strip().upper()
    if normalized in {"M", "F"}:
        return normalized
    if normalized == "MALE":
        return "M"
    if normalized == "FEMALE":
        return "F"
    return None


def parse_whatsapp_message(raw_text: str) -> Dict[str, Optional[str]]:
    """Parse canonical WhatsApp text into the fixed row schema.

    Missing fields remain None and never cause positional shifts.
    """

    core_text, timestamp = _split_message_and_technical_block(raw_text)
    record = _blank_record()
    record["timestamp"] = timestamp

    for line in core_text.splitlines():
        if ":" not in line:
            continue

        raw_label, raw_value = line.split(":", 1)
        field_name = LABEL_TO_FIELD.get(_normalize_label(raw_label))
        if not field_name:
            continue

        value = raw_value.strip()
        if not value:
            continue

        if field_name == "gender":
            record[field_name] = _normalize_gender(value)
        else:
            record[field_name] = value

    return record


def build_fixed_schema_row(record: Dict[str, Optional[str]]) -> List[Optional[str]]:
    """Return values in the guaranteed fixed schema order."""

    return [record.get(field) for field in FIXED_SCHEMA]


def build_sheet_row(
    record: Dict[str, Optional[str]], sheet_headers: Iterable[str]
) -> List[Optional[str]]:
    """Project a parsed record into the current Google Sheet headers by name.

    Unknown columns are left empty. Missing expected columns are skipped.
    """

    row: List[Optional[str]] = []
    for header in sheet_headers:
        normalized_header = _normalize_header(header)
        if normalized_header is None:
            row.append(None)
            continue
        row.append(record.get(normalized_header))
    return row
