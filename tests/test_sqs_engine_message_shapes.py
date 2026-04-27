"""Unit tests for SQSEngine.claim_batch shape handling and unparseable quarantine.

These tests do NOT touch real AWS. They construct an SQSEngine with a fake
config, replace `engine.sqs_client` with a unittest.mock.MagicMock, and redirect
the unparseable quarantine path under pytest's `tmp_path` fixture.

Run with:
    python3 -m pytest tests/test_sqs_engine_message_shapes.py
"""

from __future__ import annotations

import asyncio
import json
from pathlib import Path
from typing import Any, Dict, Optional
from unittest.mock import MagicMock

import pytest

from dam.engines.sqs_engine import SQSEngine
from dam.interface import DamMessage


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_engine(tmp_path: Path) -> SQSEngine:
    """Build an SQSEngine with a fake sqs_client and quarantine under tmp_path."""
    config = {
        "queue_url": "https://sqs.us-east-1.amazonaws.com/000000000000/test.fifo",
        "region": "us-east-1",
        "message_group_id": "test-group",
        "visibility_timeout": 30,
        "message_retention_period": 345600,
    }
    engine = SQSEngine(config=config)
    engine.sqs_client = MagicMock()
    engine.unparseable_quarantine_path = tmp_path / "unparseable_messages.jsonl"
    return engine


def _wrapper_body(
    business: Optional[Dict[str, Any]] = None,
    **overrides: Any,
) -> Dict[str, Any]:
    """Internal SQSEngine.enqueue shape: nested payload + received_at."""
    body: Dict[str, Any] = {
        "message_id": "msg_wrapper_001",
        "session_id": "sess_001",
        "technical_id": "tech_001",
        "event_ts": "2026-04-27T18:00:00+02:00",
        "src": "form_v1",
        "payload": business if business is not None else {"weight": "70", "kite": "9"},
        "received_at": "2026-04-27T16:00:00+00:00",
        "claim_count": 0,
    }
    body.update(overrides)
    return body


def _flat_lambda_body(**overrides: Any) -> Dict[str, Any]:
    """Public Lambda shape: envelope + business fields all flat at top level."""
    body: Dict[str, Any] = {
        "message_id": "msg_flat_canary02",
        "session_id": "canary_session_002",
        "technical_id": "canary_tech_002",
        "event_ts": "2026-04-27T18:00:00+02:00",
        "src": "form_v1",
        "weight": "75",
        "gender": "M",
        "board": "twintip",
        "boardSize": "138x42",
        "level": "intermediate",
        "kite": "9",
        "wind": "18",
        "brand": "Core",
        "model": "XR",
        "location": "Stagnone",
        "water": "flat",
        "result": "fun",
        "note": "canary public ingress test",
        "ts": "2026-04-27T18:00:00+02:00",
    }
    body.update(overrides)
    return body


def _make_sqs_response(*bodies: Any, receipt_prefix: str = "rh") -> Dict[str, Any]:
    """Build a fake response shaped like sqs_client.receive_message(...)."""
    messages = []
    for i, body in enumerate(bodies):
        if isinstance(body, (dict, list)):
            body_str = json.dumps(body)
        else:
            body_str = body
        messages.append({
            "Body": body_str,
            "ReceiptHandle": f"{receipt_prefix}-{i}",
        })
    return {"Messages": messages}


def _claim(engine: SQSEngine):
    """Sync-wrap claim_batch for tests (no pytest-asyncio dependency)."""
    return asyncio.run(engine.claim_batch(max_messages=10, claim_timeout_seconds=1))


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


def test_claim_batch_accepts_wrapper_shape(tmp_path):
    engine = _make_engine(tmp_path)
    engine.sqs_client.receive_message.return_value = _make_sqs_response(
        _wrapper_body(business={"weight": "67", "kite": "10", "brand": "Duotone"})
    )

    result = _claim(engine)

    assert len(result) == 1
    msg = result[0]
    assert isinstance(msg, DamMessage)
    assert msg.message_id == "msg_wrapper_001"
    assert msg.session_id == "sess_001"
    assert msg.technical_id == "tech_001"
    assert msg.event_ts == "2026-04-27T18:00:00+02:00"
    assert msg.src == "form_v1"
    assert msg.payload == {"weight": "67", "kite": "10", "brand": "Duotone"}
    assert msg.claim_token == "rh-0"
    assert msg.claim_count == 1  # 0 + 1

    engine.sqs_client.delete_message.assert_not_called()
    assert not engine.unparseable_quarantine_path.exists()


def test_claim_batch_accepts_flat_lambda_shape(tmp_path):
    engine = _make_engine(tmp_path)
    engine.sqs_client.receive_message.return_value = _make_sqs_response(_flat_lambda_body())

    result = _claim(engine)

    assert len(result) == 1
    msg = result[0]
    assert isinstance(msg, DamMessage)
    assert msg.message_id == "msg_flat_canary02"
    assert msg.session_id == "canary_session_002"
    assert msg.technical_id == "canary_tech_002"
    assert msg.event_ts == "2026-04-27T18:00:00+02:00"
    assert msg.src == "form_v1"

    # Business fields preserved inside payload.
    assert msg.payload["weight"] == "75"
    assert msg.payload["gender"] == "M"
    assert msg.payload["brand"] == "Core"
    assert msg.payload["model"] == "XR"
    assert msg.payload["location"] == "Stagnone"
    assert msg.payload["note"] == "canary public ingress test"
    assert msg.payload["ts"] == "2026-04-27T18:00:00+02:00"

    # Envelope fields MUST NOT be inside payload (otherwise relay's spread would
    # double them).
    for forbidden in (
        "message_id",
        "session_id",
        "technical_id",
        "event_ts",
        "src",
        "received_at",
        "claim_count",
    ):
        assert forbidden not in msg.payload, f"envelope key leaked into payload: {forbidden}"

    engine.sqs_client.delete_message.assert_not_called()
    assert not engine.unparseable_quarantine_path.exists()


def test_claim_batch_quarantines_unparseable_before_delete(tmp_path):
    engine = _make_engine(tmp_path)

    not_json = "this is not json {{"
    missing_required = {"foo": "bar", "message_id": "msg_only_id_no_envelope"}

    engine.sqs_client.receive_message.return_value = {
        "Messages": [
            {"Body": not_json, "ReceiptHandle": "rh-bad-0"},
            {"Body": json.dumps(missing_required), "ReceiptHandle": "rh-bad-1"},
        ]
    }

    result = _claim(engine)

    assert result == []

    # Quarantine file written, with one record per malformed message.
    assert engine.unparseable_quarantine_path.exists()
    raw = engine.unparseable_quarantine_path.read_text(encoding="utf-8").strip()
    assert raw, "quarantine file should not be empty"
    lines = raw.split("\n")
    assert len(lines) == 2

    rec0 = json.loads(lines[0])
    rec1 = json.loads(lines[1])

    assert rec0["raw_body"] == not_json
    assert rec0["reason"]
    assert rec0["quarantined_at"]
    assert rec0["message_id"] is None  # not extractable from non-JSON

    assert rec1["raw_body"] == json.dumps(missing_required)
    assert rec1["reason"]
    assert rec1["message_id"] == "msg_only_id_no_envelope"

    # delete_message called for both, AFTER quarantine succeeded.
    assert engine.sqs_client.delete_message.call_count == 2
    handles = [
        call.kwargs.get("ReceiptHandle")
        for call in engine.sqs_client.delete_message.call_args_list
    ]
    assert "rh-bad-0" in handles
    assert "rh-bad-1" in handles


def test_claim_batch_does_not_delete_if_quarantine_write_fails(tmp_path, monkeypatch):
    engine = _make_engine(tmp_path)

    # Force the quarantine helper to report failure without writing anything.
    monkeypatch.setattr(
        engine,
        "_quarantine_unparseable",
        lambda raw_body, reason: False,
    )

    not_json = "still not json"
    engine.sqs_client.receive_message.return_value = {
        "Messages": [
            {"Body": not_json, "ReceiptHandle": "rh-fail"},
        ]
    }

    result = _claim(engine)

    assert result == []
    engine.sqs_client.delete_message.assert_not_called()


def test_flat_shape_reconstructs_payload_for_relay_without_duplicate_envelope(tmp_path):
    """Mimics dam/relay.py:_release_to_submit construction to confirm the
    flat-to-DamMessage round-trip yields a clean POST body with no envelope
    duplication and the original business fields at the top level.
    """
    engine = _make_engine(tmp_path)
    engine.sqs_client.receive_message.return_value = _make_sqs_response(_flat_lambda_body())

    result = _claim(engine)
    assert len(result) == 1
    msg = result[0]

    # Replicate dam/relay.py:_release_to_submit lines 465-472.
    submit_payload = {
        "message_id": msg.message_id,
        "session_id": msg.session_id,
        "technical_id": msg.technical_id,
        "event_ts": msg.event_ts,
        "src": msg.src,
        **msg.payload,
    }

    # Envelope present exactly once, with values from the original Lambda body.
    assert submit_payload["message_id"] == "msg_flat_canary02"
    assert submit_payload["session_id"] == "canary_session_002"
    assert submit_payload["technical_id"] == "canary_tech_002"
    assert submit_payload["event_ts"] == "2026-04-27T18:00:00+02:00"
    assert submit_payload["src"] == "form_v1"

    # Business fields surface flat at the top level for /submit.
    assert submit_payload["brand"] == "Core"
    assert submit_payload["model"] == "XR"
    assert submit_payload["weight"] == "75"
    assert submit_payload["location"] == "Stagnone"
    assert submit_payload["note"] == "canary public ingress test"

    # No nested "payload" key in the POST body (would mean wrapper leaked).
    assert "payload" not in submit_payload
    # No transport metadata leaked.
    assert "received_at" not in submit_payload
    assert "claim_count" not in submit_payload

    # No envelope key duplicated by the spread.
    keys = list(submit_payload.keys())
    for env_key in ("message_id", "session_id", "technical_id", "event_ts", "src"):
        assert keys.count(env_key) == 1, f"envelope key duplicated in POST: {env_key}"
