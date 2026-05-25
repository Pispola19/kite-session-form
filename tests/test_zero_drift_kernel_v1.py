"""ZERO DRIFT KERNEL V1 — gatekeeper and safe error contract tests."""
from __future__ import annotations

import copy
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
HANDOFF_TOOLS = ROOT / "_handoff_server_live_spot" / "emergency" / "tools"
sys.path.insert(0, str(HANDOFF_TOOLS))

from zero_drift_enforcer_v1 import ContractDriftError, enforce_lock_contract, validate_lock_contract  # noqa: E402
from zero_drift_kernel_v1 import (  # noqa: E402
    KERNEL_VERSION,
    build_safe_error_contract,
    emit_wind_latest_contract,
)


def _engine_fixture_full() -> dict:
    return {
        "schema_version": "wind_decision_output_engine_v1",
        "generated_at": "2026-05-25T02:34:00.000Z",
        "updated_at": "2026-05-25T02:34:00.000Z",
        "WIND DECISION OUTPUT V1": {
            "SPOT RESOLVED": "Punta Trettu",
            "WIND NOW (knots)": 12.5,
            "GUST NOW (knots)": 15.0,
            "WIND TREND (1h / 2h / 3h)": {"1h": 13, "2h": 14, "3h": 15},
            "WIND DIRECTION (kite-relevant)": "NE",
            "KITE DECISION": "GO",
            "RELIABILITY": "HIGH",
            "updated_at": "2026-05-25T02:34:00.000Z",
        },
    }


def test_safe_error_contract_is_schema_valid():
    safe = build_safe_error_contract(now_iso="2026-05-25T12:00:00Z")
    assert validate_lock_contract(safe) == []
    assert safe["data_state"] == "error"
    assert safe["display"]["wind"]["text"] == "--"
    assert safe["display"]["kite_decision"]["text"] == "ERROR"
    assert "WIND DECISION OUTPUT V1" not in safe


def test_emit_always_returns_enforced_contract():
    out = emit_wind_latest_contract(_engine_fixture_full(), {"confidence": 0.5})
    assert validate_lock_contract(out) == []
    assert out["data_state"] == "full"


def test_emit_on_drift_returns_safe_not_engine(monkeypatch):
    call = {"n": 0}

    def flaky_enforce(contract):
        call["n"] += 1
        if call["n"] == 1:
            raise ContractDriftError("forced drift")
        return enforce_lock_contract(contract)

    monkeypatch.setattr("zero_drift_kernel_v1.enforce_lock_contract", flaky_enforce)
    out = emit_wind_latest_contract(_engine_fixture_full(), {})
    assert validate_lock_contract(out) == []
    assert out["data_state"] == "error"
    assert out["display"]["kite_decision"]["text"] == "ERROR"
    assert out["meta"]["kernel"] == KERNEL_VERSION
    assert out["meta"]["failure_mode"] == "safe_error_contract"


def test_emit_on_invalid_draft_returns_safe():
    engine = {"generated_at": "2026-05-25T12:00:00Z", "WIND DECISION OUTPUT V1": {}}
    bad_draft = emit_wind_latest_contract(engine, {})
    assert bad_draft["data_state"] == "error"
    assert validate_lock_contract(bad_draft) == []


def test_kernel_never_raises_to_caller():
    out = emit_wind_latest_contract({"invalid": True}, None)
    enforce_lock_contract(out)
