"""AWS Lambda handler — ingresso pubblico verso diga SQS FIFO.

Riceve POST JSON dal frontend (via API Gateway HTTP API), valida i campi
minimi del contratto FE (`message_id`, `session_id`, `technical_id`,
`event_ts`, `src`), filtra i payload di test (marker proibiti coerenti con
``ingest_api/main.py``) e invia il payload originale alla coda SQS FIFO
con ``MessageGroupId=kite-data`` e ``MessageDeduplicationId=message_id``.

Risposta success (HTTP 200):
    {"ok": true, "durable": true, "dam_received": true,
     "message_id": "...", "received_at": "...", "engine_type": "SQS"}

Compatibile col contratto richiesto da ``submitPayload`` in
``app.js`` (campi ``ok=true`` e ``durable=true``).

Tutte le risposte includono header CORS coerenti con ``ALLOWED_ORIGIN``.

Ambiente Lambda atteso (env vars):
    SQS_QUEUE_URL          (richiesto)
    SQS_REGION             (default: us-east-1)
    MESSAGE_GROUP_ID       (default: kite-data)
    ALLOWED_ORIGIN         (default: *  — sostituire in prod con dominio FE)
    MAX_BODY_BYTES         (default: 65536)
    EXPECTED_SRC           (default: form_v1)
    FORBIDDEN_MARKERS      (csv, default coerente con ingest_api/main.py)
    FILTERED_TEST_FIELDS   (csv, default: session_id,technical_id,src)
    LOG_LEVEL              (default: INFO)

Runtime: Python 3.12. Dipende solo da boto3 (fornito dal runtime Lambda).
"""

from __future__ import annotations

import json
import logging
import os
import re
from datetime import datetime, timezone
from typing import Any

import boto3
from botocore.config import Config as BotoConfig
from botocore.exceptions import BotoCoreError, ClientError

LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()
logger = logging.getLogger()
logger.setLevel(LOG_LEVEL)

SQS_QUEUE_URL = os.environ.get("SQS_QUEUE_URL", "").strip()
SQS_REGION = os.environ.get("SQS_REGION", "us-east-1").strip() or "us-east-1"
MESSAGE_GROUP_ID = os.environ.get("MESSAGE_GROUP_ID", "kite-data").strip() or "kite-data"
ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*").strip() or "*"

try:
    MAX_BODY_BYTES = int(os.environ.get("MAX_BODY_BYTES", "65536"))
except ValueError:
    MAX_BODY_BYTES = 65536

EXPECTED_SRC = os.environ.get("EXPECTED_SRC", "form_v1").strip() or "form_v1"

DEFAULT_FORBIDDEN_MARKERS = (
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
_raw_markers = os.environ.get("FORBIDDEN_MARKERS", "")
FORBIDDEN_MARKERS: tuple[str, ...] = tuple(
    m.strip() for m in _raw_markers.split(",") if m.strip()
) or DEFAULT_FORBIDDEN_MARKERS

DEFAULT_FILTERED_TEST_FIELDS = ("session_id", "technical_id", "src")
_raw_filtered = os.environ.get("FILTERED_TEST_FIELDS", "")
FILTERED_TEST_FIELDS: tuple[str, ...] = tuple(
    f.strip() for f in _raw_filtered.split(",") if f.strip()
) or DEFAULT_FILTERED_TEST_FIELDS

REQUIRED_FIELDS: tuple[str, ...] = (
    "message_id",
    "session_id",
    "technical_id",
    "event_ts",
    "src",
)

MESSAGE_ID_REGEX = re.compile(r"^msg_[a-f0-9]{16,160}_[a-z0-9]{0,12}$")
ID_REGEX = re.compile(r"^[A-Za-z0-9_\-:.]{1,128}$")
ISO_TS_REGEX = re.compile(
    r"^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$"
)

_sqs_client = boto3.client(
    "sqs",
    region_name=SQS_REGION,
    config=BotoConfig(
        retries={"max_attempts": 3, "mode": "standard"},
        connect_timeout=3,
        read_timeout=5,
    ),
)


def _cors_headers() -> dict[str, str]:
    return {
        "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "3600",
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
    }


def _response(status_code: int, body: dict[str, Any]) -> dict[str, Any]:
    return {
        "statusCode": status_code,
        "headers": _cors_headers(),
        "body": json.dumps(body, ensure_ascii=False),
    }


def _bad_request(reason: str, **extra: Any) -> dict[str, Any]:
    body = {"ok": False, "reason": reason}
    body.update(extra)
    return _response(400, body)


def _discarded(reason: str, **extra: Any) -> dict[str, Any]:
    body = {"ok": False, "discarded": True, "reason": reason}
    body.update(extra)
    return _response(200, body)


def _server_error(reason: str) -> dict[str, Any]:
    return _response(502, {"ok": False, "reason": reason})


def _is_options(event: dict[str, Any]) -> bool:
    method = (
        (event.get("requestContext") or {})
        .get("http", {})
        .get("method")
        or event.get("httpMethod")
        or ""
    )
    return method.upper() == "OPTIONS"


def _extract_body(event: dict[str, Any]) -> tuple[str | None, str | None]:
    raw = event.get("body")
    if raw is None:
        return None, "missing_body"
    if event.get("isBase64Encoded"):
        import base64
        try:
            decoded = base64.b64decode(raw, validate=False)
        except Exception:
            return None, "invalid_base64_body"
        if len(decoded) > MAX_BODY_BYTES:
            return None, "body_too_large"
        try:
            return decoded.decode("utf-8"), None
        except UnicodeDecodeError:
            return None, "invalid_utf8_body"
    if isinstance(raw, (bytes, bytearray)):
        if len(raw) > MAX_BODY_BYTES:
            return None, "body_too_large"
        try:
            return bytes(raw).decode("utf-8"), None
        except UnicodeDecodeError:
            return None, "invalid_utf8_body"
    if isinstance(raw, str):
        if len(raw.encode("utf-8")) > MAX_BODY_BYTES:
            return None, "body_too_large"
        return raw, None
    return None, "invalid_body_type"


def _find_forbidden_marker(payload: dict[str, Any]) -> str | None:
    for field_name in FILTERED_TEST_FIELDS:
        raw_value = payload.get(field_name)
        if not isinstance(raw_value, str):
            continue
        normalized = raw_value.casefold()
        for marker in FORBIDDEN_MARKERS:
            if marker and marker in normalized:
                return marker
    return None


def _validate_payload(payload: dict[str, Any]) -> str | None:
    for field in REQUIRED_FIELDS:
        value = payload.get(field)
        if value is None:
            return f"missing_field:{field}"
        if not isinstance(value, str):
            return f"invalid_type:{field}"
        if not value.strip():
            return f"empty_field:{field}"

    message_id = payload["message_id"]
    if not MESSAGE_ID_REGEX.match(message_id):
        return "invalid_message_id"

    if not ID_REGEX.match(payload["session_id"]):
        return "invalid_session_id"
    if not ID_REGEX.match(payload["technical_id"]):
        return "invalid_technical_id"

    if not ISO_TS_REGEX.match(payload["event_ts"]):
        return "invalid_event_ts"

    if payload["src"] != EXPECTED_SRC:
        return "invalid_src"

    return None


def _send_to_sqs(payload: dict[str, Any]) -> dict[str, Any]:
    message_body = json.dumps(payload, ensure_ascii=False)
    response = _sqs_client.send_message(
        QueueUrl=SQS_QUEUE_URL,
        MessageBody=message_body,
        MessageGroupId=MESSAGE_GROUP_ID,
        MessageDeduplicationId=payload["message_id"],
    )
    return response


def _log_request(level: int, **fields: Any) -> None:
    try:
        logger.log(level, json.dumps(fields, ensure_ascii=False, default=str))
    except Exception:
        logger.log(level, str(fields))


def lambda_handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    request_id = getattr(context, "aws_request_id", "")
    start_ts = datetime.now(timezone.utc)

    if _is_options(event):
        return {"statusCode": 204, "headers": _cors_headers(), "body": ""}

    if not SQS_QUEUE_URL:
        _log_request(logging.ERROR, request_id=request_id, reason="missing_sqs_queue_url")
        return _server_error("misconfigured_target")

    body_str, body_err = _extract_body(event)
    if body_err is not None:
        _log_request(logging.WARNING, request_id=request_id, reason=body_err)
        if body_err == "body_too_large":
            return _response(413, {"ok": False, "reason": "body_too_large"})
        return _bad_request(body_err)

    try:
        payload = json.loads(body_str)
    except json.JSONDecodeError:
        _log_request(logging.WARNING, request_id=request_id, reason="invalid_json")
        return _bad_request("invalid_json")

    if not isinstance(payload, dict):
        _log_request(logging.WARNING, request_id=request_id, reason="payload_must_be_object")
        return _bad_request("payload_must_be_object")

    validation_error = _validate_payload(payload)
    if validation_error is not None:
        _log_request(
            logging.WARNING,
            request_id=request_id,
            reason=validation_error,
            session_id=payload.get("session_id"),
        )
        return _bad_request(validation_error)

    forbidden = _find_forbidden_marker(payload)
    if forbidden is not None:
        _log_request(
            logging.INFO,
            request_id=request_id,
            event="discarded_forbidden_marker",
            marker=forbidden,
            session_id=payload.get("session_id"),
            message_id=payload.get("message_id"),
        )
        return _discarded("forbidden_test_payload", marker=forbidden)

    try:
        sqs_resp = _send_to_sqs(payload)
    except (BotoCoreError, ClientError) as exc:
        _log_request(
            logging.ERROR,
            request_id=request_id,
            event="sqs_send_failed",
            error=str(exc),
            message_id=payload.get("message_id"),
        )
        return _server_error("enqueue_failed")

    received_at = datetime.now(timezone.utc).isoformat()
    latency_ms = int((datetime.now(timezone.utc) - start_ts).total_seconds() * 1000)
    _log_request(
        logging.INFO,
        request_id=request_id,
        event="enqueued",
        sqs_message_id=sqs_resp.get("MessageId"),
        sequence_number=sqs_resp.get("SequenceNumber"),
        message_id=payload.get("message_id"),
        session_id=payload.get("session_id"),
        src=payload.get("src"),
        latency_ms=latency_ms,
    )

    return _response(
        200,
        {
            "ok": True,
            "durable": True,
            "dam_received": True,
            "message_id": payload["message_id"],
            "received_at": received_at,
            "engine_type": "SQS",
        },
    )
