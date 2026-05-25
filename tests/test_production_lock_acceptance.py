"""PRODUCTION LOCK V1 — acceptance criteria for zero drift final state."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
TOOLS = ROOT / "_handoff_server_live_spot" / "emergency" / "tools"
GOLDEN_SAFE = ROOT / "tests" / "golden" / "safe_error_contract_v1.json"
sys.path.insert(0, str(TOOLS))

from zero_drift_enforcer_v1 import validate_lock_contract  # noqa: E402
from zero_drift_kernel_v1 import (  # noqa: E402
    CONTRACT_VERSION,
    KERNEL_VERSION,
    build_safe_error_contract,
    emit_wind_latest_contract,
)

ENGINE_LEAK_KEYS = {
    "WIND DECISION OUTPUT V1",
    "wind_knots",
    "wind_kt",
    "wind_direction",
    "gust_knots",
    "guardrails",
    "trust_enrichment_v1",
}


def _engine_full() -> dict:
    return {
        "generated_at": "2026-05-25T02:34:00.000Z",
        "updated_at": "2026-05-25T02:34:00.000Z",
        "WIND DECISION OUTPUT V1": {
            "SPOT RESOLVED": "Is Solinas",
            "WIND NOW (knots)": 9.4,
            "GUST NOW (knots)": 11.1,
            "WIND TREND (1h / 2h / 3h)": {"1h": 1.8, "2h": 2.3, "3h": 0.5},
            "WIND DIRECTION (kite-relevant)": "W",
            "KITE DECISION": "NO GO",
            "RELIABILITY": "HIGH",
            "updated_at": "2026-05-25T02:34:00.000Z",
        },
    }


def test_wind_latest_output_is_always_lock_or_safe():
    out = emit_wind_latest_contract(_engine_full(), {"confidence": 0.9})
    assert out["contract_version"] == CONTRACT_VERSION
    assert validate_lock_contract(out) == []
    assert not ENGINE_LEAK_KEYS.intersection(out.keys())


def test_safe_error_contract_display_spec():
    safe = build_safe_error_contract(now_iso="2026-05-25T12:00:00Z")
    assert safe["contract_version"] == CONTRACT_VERSION
    assert safe["data_state"] == "error"
    assert safe["display"]["wind"]["text"] == "--"
    assert safe["display"]["kite_decision"]["text"] == "ERROR"
    assert safe["display"]["reliability"]["text"] == "LOW"
    assert safe["meta"]["failure_mode"] == "safe_error_contract"
    assert validate_lock_contract(safe) == []
    assert not ENGINE_LEAK_KEYS.intersection(safe.keys())


def test_safe_error_golden_snapshot():
    safe = build_safe_error_contract(now_iso="2026-05-25T12:00:00Z")
    assert GOLDEN_SAFE.is_file()
    golden = json.loads(GOLDEN_SAFE.read_text(encoding="utf-8"))
    for key in (
        "wind",
        "gust",
        "direction",
        "kite_decision",
        "reliability",
        "spot",
        "updated_at",
    ):
        assert safe["display"][key] == golden["display"][key]


def test_kernel_never_exposes_engine_on_drift(monkeypatch):
    from zero_drift_enforcer_v1 import ContractDriftError, enforce_lock_contract as real_enforce

    calls = {"n": 0}

    def fail_first(contract):
        calls["n"] += 1
        if calls["n"] == 1:
            raise ContractDriftError("simulated")
        return real_enforce(contract)

    monkeypatch.setattr("zero_drift_kernel_v1.enforce_lock_contract", fail_first)
    out = emit_wind_latest_contract(_engine_full(), {})
    assert out["data_state"] == "error"
    assert out["meta"]["kernel"] == KERNEL_VERSION
    assert "WIND DECISION OUTPUT V1" not in out
