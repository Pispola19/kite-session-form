"""ZERO DRIFT ENFORCER V1 — validation and rejection tests."""
from __future__ import annotations

import copy
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
HANDOFF_TOOLS = ROOT / "_handoff_server_live_spot" / "emergency" / "tools"
sys.path.insert(0, str(HANDOFF_TOOLS))

from zero_drift_enforcer_v1 import (  # noqa: E402
    CONTRACT_VERSION,
    ContractDriftError,
    enforce_lock_contract,
    validate_lock_contract,
)
from zero_drift_kernel_v1 import emit_wind_latest_contract  # noqa: E402


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


def test_kernel_output_always_passes_enforcer():
    out = emit_wind_latest_contract(_engine_fixture_full(), {"confidence": 0.9})
    assert validate_lock_contract(out) == []
    assert out["contract_version"] == CONTRACT_VERSION


def test_enforcer_rejects_missing_display_wind():
    out = emit_wind_latest_contract(_engine_fixture_full(), {})
    bad = copy.deepcopy(out)
    del bad["display"]["wind"]
    with pytest.raises(ContractDriftError) as exc:
        enforce_lock_contract(bad)
    assert "display.wind missing" in str(exc.value)


def test_enforcer_rejects_wrong_contract_version():
    out = emit_wind_latest_contract(_engine_fixture_full(), {})
    bad = copy.deepcopy(out)
    bad["contract_version"] = "relay_v2"
    with pytest.raises(ContractDriftError):
        enforce_lock_contract(bad)


def test_enforcer_rejects_engine_leak_at_top_level():
    out = emit_wind_latest_contract(_engine_fixture_full(), {})
    bad = copy.deepcopy(out)
    bad["WIND DECISION OUTPUT V1"] = {}
    with pytest.raises(ContractDriftError) as exc:
        enforce_lock_contract(bad)
    assert "engine leak" in str(exc.value)


def test_enforcer_rejects_bad_forecast_keys():
    out = emit_wind_latest_contract(_engine_fixture_full(), {})
    bad = copy.deepcopy(out)
    bad["forecast"]["4h"] = bad["forecast"]["1h"]
    del bad["forecast"]["1h"]
    with pytest.raises(ContractDriftError):
        enforce_lock_contract(bad)


