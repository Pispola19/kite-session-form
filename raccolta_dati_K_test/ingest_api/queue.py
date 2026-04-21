import fcntl
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


QUEUE_FILE = Path(
    os.environ.get(
        "DM_INGEST_QUEUE_FILE",
        "/Users/PER_TEST/raccolta_dati_K_test/ingest_api/storage/submissions.jsonl",
    )
)


def _fsync_directory(path: Path) -> None:
    dir_fd = os.open(str(path), os.O_RDONLY)
    try:
        os.fsync(dir_fd)
    finally:
        os.close(dir_fd)


def _write_all(fd: int, data: bytes) -> int:
    total_written = 0
    while total_written < len(data):
        written = os.write(fd, data[total_written:])
        if written <= 0:
            raise OSError("queue write returned 0 bytes")
        total_written += written
    return total_written


def send_to_queue(payload: dict[str, Any]) -> dict[str, Any]:
    payload = dict(payload)
    payload["_enqueued_at"] = datetime.now(timezone.utc).isoformat()

    QUEUE_FILE.parent.mkdir(parents=True, exist_ok=True)
    queue_preexisted = QUEUE_FILE.exists()
    line = json.dumps(payload, ensure_ascii=False) + "\n"
    encoded_line = line.encode("utf-8")

    fd = os.open(str(QUEUE_FILE), os.O_WRONLY | os.O_APPEND | os.O_CREAT, 0o644)
    try:
        fcntl.flock(fd, fcntl.LOCK_EX)
        start_offset = os.lseek(fd, 0, os.SEEK_END)
        bytes_written = _write_all(fd, encoded_line)
        os.fsync(fd)
        end_offset = os.lseek(fd, 0, os.SEEK_END)
    finally:
        try:
            fcntl.flock(fd, fcntl.LOCK_UN)
        finally:
            os.close(fd)

    if not queue_preexisted:
        _fsync_directory(QUEUE_FILE.parent)

    return {
        "durable": True,
        "queue_file": str(QUEUE_FILE),
        "start_offset": start_offset,
        "end_offset": end_offset,
        "bytes_written": bytes_written,
        "enqueued_at": payload["_enqueued_at"],
    }
