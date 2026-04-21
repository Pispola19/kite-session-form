import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path


QUEUE_FILE = Path(
    os.environ.get(
        "DM_INGEST_QUEUE_FILE",
        "/Users/PER_TEST/raccolta_dati_K_test/ingest_api/storage/submissions.jsonl",
    )
)
OUTPUT_FILE = Path(
    os.environ.get(
        "DM_INGEST_WORKER_OUTPUT_FILE",
        "/Users/PER_TEST/raccolta_dati_K_test/ingest_api/storage/worker_output.jsonl",
    )
)
OFFSET_FILE = Path(
    os.environ.get(
        "DM_INGEST_WORKER_OFFSET_FILE",
        "/Users/PER_TEST/raccolta_dati_K_test/ingest_api/storage/worker_offset.txt",
    )
)
LOG_FILE = Path(os.environ.get("DM_INGEST_LOG_FILE", "/Users/PER_TEST/system.log"))
POLL_SECONDS = float(os.environ.get("DM_INGEST_WORKER_POLL_SECONDS", "1.0"))


def log_event(message: str) -> None:
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    line = f"{datetime.now(timezone.utc).isoformat()} [worker] {message}\n"
    fd = os.open(str(LOG_FILE), os.O_WRONLY | os.O_APPEND | os.O_CREAT, 0o644)
    try:
        os.write(fd, line.encode("utf-8"))
        os.fsync(fd)
    finally:
        os.close(fd)


def read_saved_offset() -> tuple[int | None, str]:
    if not OFFSET_FILE.exists():
        return None, "offset_missing"

    try:
        offset = int(OFFSET_FILE.read_text(encoding="utf-8").strip() or "0")
    except Exception:
        return None, "offset_invalid"

    if offset < 0:
        return None, "offset_negative"

    return offset, "offset_restored"


def load_offset() -> tuple[int, int, str]:
    if not QUEUE_FILE.exists():
        return 0, 0, "queue_missing"

    queue_size = QUEUE_FILE.stat().st_size
    offset, reason = read_saved_offset()
    if offset is None:
        return 0, queue_size, f"{reason}_recover_from_start"

    if offset > queue_size:
        return 0, queue_size, "offset_ahead_of_file_recover_from_start"

    if offset < queue_size:
        return offset, queue_size, "offset_restored_backlog_pending"

    return offset, queue_size, reason


def save_offset(offset: int) -> None:
    OFFSET_FILE.parent.mkdir(parents=True, exist_ok=True)
    temp_file = OFFSET_FILE.with_name(f"{OFFSET_FILE.name}.tmp")

    with temp_file.open("w", encoding="utf-8") as handle:
        handle.write(str(offset))
        handle.flush()
        os.fsync(handle.fileno())

    os.replace(temp_file, OFFSET_FILE)


def append_jsonl(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    line = json.dumps(payload, ensure_ascii=False) + "\n"
    fd = os.open(str(path), os.O_WRONLY | os.O_APPEND | os.O_CREAT, 0o644)
    try:
        os.write(fd, line.encode("utf-8"))
        os.fsync(fd)
    finally:
        os.close(fd)


def log_cycle_summary(
    *,
    start_offset: int,
    final_offset: int,
    queue_size: int,
    records_read: int,
    forwarded: int,
    invalid_json: int,
    append_errors: int,
) -> None:
    log_event(
        "cycle "
        f"start_offset={start_offset} final_offset={final_offset} queue_size={queue_size} "
        f"records_read={records_read} forwarded={forwarded} invalid_json={invalid_json} append_errors={append_errors}"
    )


def main() -> None:
    print("Worker started (file queue mode)...")

    seen_offset: int | None = None
    last_file_signature: tuple[int, int] | None = None
    log_event("started")

    while True:
        if not QUEUE_FILE.exists():
            time.sleep(POLL_SECONDS)
            continue

        queue_stat = QUEUE_FILE.stat()
        queue_size = queue_stat.st_size
        queue_signature = (queue_size, queue_stat.st_mtime_ns)

        if seen_offset is None:
            seen_offset, queue_size, startup_reason = load_offset()
            save_offset(seen_offset)
            log_event(
                f"startup offset={seen_offset} queue_size={queue_size} reason={startup_reason}"
            )

        if seen_offset > queue_size:
            seen_offset = 0
            save_offset(seen_offset)
            log_event("queue file truncated; offset reset to 0")

        pending_bytes = max(0, queue_size - seen_offset)
        if pending_bytes > 0 and queue_signature != last_file_signature:
            log_event(
                f"backlog_detected current_offset={seen_offset} queue_size={queue_size} pending_bytes={pending_bytes}"
            )

        start_offset = seen_offset
        records_read = 0
        forwarded = 0
        invalid_json = 0
        append_errors = 0

        with QUEUE_FILE.open("r", encoding="utf-8") as handle:
            handle.seek(seen_offset)

            while True:
                line_start = handle.tell()
                raw_line = handle.readline()
                if not raw_line:
                    break
                line_end = handle.tell()
                records_read += 1

                try:
                    data = json.loads(raw_line.strip())
                except Exception as exc:
                    seen_offset = line_end
                    save_offset(seen_offset)
                    invalid_json += 1
                    log_event(f"invalid json skipped offset={line_start} error={exc}")
                    continue

                try:
                    append_jsonl(OUTPUT_FILE, data)
                except Exception as exc:
                    append_errors += 1
                    log_event(f"output append failed offset={line_start} error={exc}")
                    break

                seen_offset = line_end
                save_offset(seen_offset)
                forwarded += 1

                event_id = data.get("session_id") or data.get("test_id") or data.get("technical_id") or "unknown"
                print("PROCESSED:", data.get("session_id") or data.get("test_id"))
                log_event(f"processed event={event_id} offset={seen_offset}")

        if records_read > 0 or queue_signature != last_file_signature:
            log_cycle_summary(
                start_offset=start_offset,
                final_offset=seen_offset,
                queue_size=queue_size,
                records_read=records_read,
                forwarded=forwarded,
                invalid_json=invalid_json,
                append_errors=append_errors,
            )

        last_file_signature = queue_signature
        time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()
