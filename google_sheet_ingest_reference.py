"""Reference parser/writer for WhatsApp -> Google Sheet ingest.

This module is intentionally pure and side-effect free so the same logic can be
ported into a Google Apps Script webhook without relying on positional columns.
"""

from __future__ import annotations

import re
from typing import Dict, Iterable, List, Optional

FIXED_SCHEMA: List[str] = [
    "timestamp",
    "event_ts",
    "ingest_ts",
    "ID",
    "technical_id",
    "session_id_raw",
    "src",
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
    "ID": "ID",
    "Technical ID": "technical_id",
    "Session ID": "session_id_raw",
    "Event TS": "event_ts",
    "Ingest TS": "ingest_ts",
    "SRC": "src",
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
    "event_ts": "event_ts",
    "event ts": "event_ts",
    "ingest_ts": "ingest_ts",
    "ingest ts": "ingest_ts",
    "id": "ID",
    "technical_id": "technical_id",
    "technical id": "technical_id",
    "session_id": "session_id_raw",
    "session id": "session_id_raw",
    "session_id_raw": "session_id_raw",
    "session id raw": "session_id_raw",
    "src": "src",
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

FRONTEND_TO_FIELD: Dict[str, str] = {
    "ts": "event_ts",
    "timestamp": "event_ts",
    "ID": "ID",
    "id": "ID",
    "technical_id": "technical_id",
    "session_id": "session_id_raw",
    "session_id_raw": "session_id_raw",
    "event_ts": "event_ts",
    "src": "src",
    "weight": "weight",
    "gender": "gender",
    "board": "board",
    "boardSize": "board_size",
    "board_size": "board_size",
    "level": "level",
    "kite": "kite_size",
    "kite_size": "kite_size",
    "wind": "wind",
    "brand": "brand",
    "model": "model",
    "location": "location",
    "water": "water",
    "result": "result",
    "note": "note",
}

TECHNICAL_BLOCK_RE = re.compile(
    r"\n---\nTS:\s*(?P<ts>[^\n]+)\nSIG:\s*(?P<sig>[a-f0-9]{8,10})\n---\s*\Z"
)
LEGACY_TECHNICAL_BLOCK_RE = re.compile(
    r"\n---\nID:\s*(?P<id>[a-z0-9]{10})\nTS:\s*(?P<ts>[^\n]+)\nSRC:\s*(?P<src>[^\n]+)\nSIG:\s*(?P<sig>[a-f0-9]{8,10})\n---\s*\Z"
)


def _blank_record() -> Dict[str, Optional[str]]:
    return {field: None for field in FIXED_SCHEMA}


def _split_message_and_technical_block(raw_text: str) -> tuple[str, Optional[str]]:
    text = str(raw_text or "").strip()
    match = TECHNICAL_BLOCK_RE.search(text)
    if match:
        core_text = text[: match.start()].rstrip()
        return core_text, match.group("ts").strip()

    legacy_match = LEGACY_TECHNICAL_BLOCK_RE.search(text)
    if not legacy_match:
        return text, None
    core_text = text[: legacy_match.start()].rstrip()
    return core_text, legacy_match.group("ts").strip()


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


def _clean_value(value: object) -> Optional[str]:
    if value is None:
        return None
    normalized = str(value).strip()
    return normalized or None


def normalize_frontend_payload(payload: Dict[str, object]) -> Dict[str, Optional[str]]:
    """Normalize the JSON payload currently posted by the frontend webhook."""

    record = _blank_record()

    for source_key, target_key in FRONTEND_TO_FIELD.items():
        if source_key not in payload:
            continue
        value = _clean_value(payload.get(source_key))
        if value is None:
            continue
        if target_key == "gender":
            record[target_key] = _normalize_gender(value)
        else:
            record[target_key] = value

    fallback_values = {
        "timestamp": _clean_value(payload.get("event_ts") or payload.get("ts") or payload.get("timestamp")),
        "event_ts": _clean_value(payload.get("event_ts") or payload.get("ts") or payload.get("timestamp")),
        "ID": _clean_value(payload.get("ID") or payload.get("id")),
        "technical_id": _clean_value(payload.get("technical_id")),
        "session_id_raw": _clean_value(
            payload.get("session_id_raw")
            or payload.get("session_id")
            or payload.get("ID")
            or payload.get("id")
        ),
        "src": _clean_value(payload.get("src")),
    }

    for target_key, value in fallback_values.items():
        if value is None:
            continue
        record[target_key] = value

    return record


def parse_whatsapp_message(raw_text: str) -> Dict[str, Optional[str]]:
    """Parse canonical WhatsApp text into the fixed row schema.

    Missing fields remain None and never cause positional shifts.
    """

    text = str(raw_text or "").strip()
    core_text, timestamp = _split_message_and_technical_block(text)
    record = _blank_record()
    record["timestamp"] = timestamp
    record["event_ts"] = timestamp

    legacy_match = LEGACY_TECHNICAL_BLOCK_RE.search(text)
    if legacy_match:
        record["session_id_raw"] = legacy_match.group("id").strip()
        record["src"] = legacy_match.group("src").strip()

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
