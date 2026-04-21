from datetime import datetime, timezone
from pathlib import Path
from typing import Any
import os

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from ingest_api.queue import send_to_queue


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
LOG_FILE = Path("/Users/PER_TEST/system.log")
FORBIDDEN_TEST_MARKERS = (
    "test",
    "testtasttist",
    "e2e",
    "hard_",
    "fix_",
    "stb_",
    "queue-test",
    "manual_test",
    "deep_test",
    "codex_fix_test",
)
FILTERED_TEST_FIELDS = ("session_id", "technical_id", "src")


def log_event(message: str) -> None:
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    line = f"{datetime.now(timezone.utc).isoformat()} [ingest_api] {message}\n"
    fd = os.open(str(LOG_FILE), os.O_WRONLY | os.O_APPEND | os.O_CREAT, 0o644)
    try:
        os.write(fd, line.encode("utf-8"))
        os.fsync(fd)
    finally:
        os.close(fd)


def find_forbidden_test_marker(payload: Any) -> str | None:
    if not isinstance(payload, dict):
        return None

    for field_name in FILTERED_TEST_FIELDS:
        raw_value = payload.get(field_name)
        if not isinstance(raw_value, str):
            continue

        normalized = raw_value.casefold()
        for marker in FORBIDDEN_TEST_MARKERS:
            if marker in normalized:
                return marker
    return None


@app.api_route("/submit", methods=["POST", "OPTIONS"])
async def submit(request: Request) -> dict[str, Any]:
    payload: Any = await request.json()

    if isinstance(payload, dict):
        record = payload
    else:
        record = {
            "payload": payload,
            "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        }

    forbidden_marker = find_forbidden_test_marker(record)
    if forbidden_marker is not None:
        log_event(f"discarded record marker={forbidden_marker}")
        return {
            "ok": False,
            "discarded": True,
            "reason": "forbidden_test_payload",
        }

    event_id = record.get("session_id") or record.get("technical_id") or record.get("src") or "unknown"

    try:
        receipt = send_to_queue(record)
    except Exception as exc:
        log_event(f"durable_write_failed event={event_id} error={exc}")
        raise HTTPException(status_code=500, detail="durable_write_failed") from exc

    log_event(
        "durable_write_completed "
        f"event={event_id} queue_file={receipt['queue_file']} "
        f"start_offset={receipt['start_offset']} end_offset={receipt['end_offset']} "
        f"bytes_written={receipt['bytes_written']}"
    )

    return {
        "ok": True,
        "durable": True,
        "receipt": receipt,
    }
