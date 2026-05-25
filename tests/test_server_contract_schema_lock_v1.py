"""Snapshot tests for SERVER CONTRACT SCHEMA LOCK V1 relay mapping."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HANDOFF_TOOLS = ROOT / "_handoff_server_live_spot" / "emergency" / "tools"
GOLDEN = ROOT / "tests" / "golden" / "server_contract_schema_lock_v1_full.json"
sys.path.insert(0, str(HANDOFF_TOOLS))

from zero_drift_enforcer_v1 import CONTRACT_VERSION, validate_lock_contract  # noqa: E402
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


def test_contract_version_and_display_full():
    out = emit_wind_latest_contract(_engine_fixture_full(), {"lat": 39.0, "lon": 9.0, "confidence": 0.95})
    assert validate_lock_contract(out) == []
    assert out["contract_version"] == CONTRACT_VERSION
    assert out["data_state"] == "full"
    assert out["display"]["wind"]["text"] == "12.5 kn"
    assert out["display"]["direction"]["text"] == "NE"
    assert out["display"]["kite_decision"]["text"] == "GO"
    assert out["display"]["reliability"]["text"] == "HIGH"
    assert out["display"]["forecast_3h"]["text"] == "15 kn"
    assert out["display"]["updated_at"]["text"] == "04:34"
    assert out["wind"]["speed_knots"] == 12.5
    assert out["decision"]["kite"] == "GO"


def test_partial_missing_direction():
    engine = {
        "generated_at": "2026-05-25T12:00:00Z",
        "WIND DECISION OUTPUT V1": {
            "SPOT RESOLVED": "Chia",
            "WIND NOW (knots)": 2.9,
            "WIND TREND (1h / 2h / 3h)": {"1h": None, "2h": None, "3h": None},
            "WIND DIRECTION (kite-relevant)": None,
            "KITE DECISION": "NO GO",
            "RELIABILITY": "HIGH",
        },
    }
    out = emit_wind_latest_contract(engine, {})
    assert out["data_state"] == "partial"
    assert out["display"]["wind"]["text"] == "2.9 kn"
    assert out["display"]["wind_name"]["text"] == ""
    assert out["display"]["forecast_1h"]["state"] == "no_forecast"


def test_golden_snapshot_matches_kernel():
    out = emit_wind_latest_contract(_engine_fixture_full(), {"lat": 39.0, "lon": 9.0})
    assert GOLDEN.is_file(), f"missing golden file: {GOLDEN}"
    golden = json.loads(GOLDEN.read_text(encoding="utf-8"))
    assert out["contract_version"] == golden["contract_version"]
    assert out["data_state"] == golden["data_state"]
    assert out["display"]["wind"] == golden["display"]["wind"]
    assert out["display"]["forecast_3h"] == golden["display"]["forecast_3h"]
    assert set(out["forecast"].keys()) == set(golden["forecast"].keys())
