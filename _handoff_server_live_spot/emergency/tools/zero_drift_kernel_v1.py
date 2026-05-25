#!/usr/bin/env python3
"""ZERO DRIFT KERNEL V1 — immutable single gatekeeper for /wind/latest UX output.

No engine output may bypass enforce_lock_contract().
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from server_contract_schema_lock_v1 import RELAY_VERSION, _build_lock_contract_draft
from zero_drift_enforcer_v1 import (
    CONTRACT_VERSION,
    SCHEMA_VERSION,
    ContractDriftError,
    enforce_lock_contract,
)

KERNEL_VERSION = "zero_drift_kernel_v1"

ENGINE_LEAK_TOP_KEYS = frozenset(
    {
        "WIND DECISION OUTPUT V1",
        "wind_knots",
        "wind_kt",
        "wind_direction",
        "gust_knots",
        "guardrails",
        "trust_enrichment_v1",
    }
)


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _display_missing(text: str) -> dict[str, str]:
    return {"state": "missing_data", "text": text}


def _forecast_slot_empty() -> dict[str, Any]:
    return {"wind_knots": None, "gust_knots": None, "direction_deg": None}


def build_safe_error_contract(
    *,
    latency_ms: int = 0,
    now_iso: str | None = None,
) -> dict[str, Any]:
    """Mandatory schema-valid failure response — no engine leak."""
    now = now_iso or _utc_now_iso()
    return {
        "contract_version": CONTRACT_VERSION,
        "schema_version": SCHEMA_VERSION,
        "generated_at": now,
        "updated_at": now,
        "data_state": "error",
        "spot": {
            "name": "",
            "lat": None,
            "lon": None,
            "source": "catalog",
            "confidence": 0.0,
        },
        "wind": {
            "speed_knots": None,
            "gust_knots": None,
            "direction_deg": None,
            "direction_label": "",
            "source": "model",
            "confidence": 0.0,
        },
        "forecast": {
            "1h": _forecast_slot_empty(),
            "2h": _forecast_slot_empty(),
            "3h": _forecast_slot_empty(),
        },
        "decision": {
            "kite": "UNKNOWN",
            "reason_code": "UNKNOWN",
            "confidence": 0.0,
        },
        "display": {
            "wind": _display_missing("--"),
            "gust": _display_missing("--"),
            "direction": _display_missing("--"),
            "wind_name": _display_missing("--"),
            "kite_decision": _display_missing("ERROR"),
            "reliability": _display_missing("LOW"),
            "spot": _display_missing("--"),
            "updated_at": _display_missing("--"),
            "forecast_1h": {"state": "no_forecast", "text": ""},
            "forecast_2h": {"state": "no_forecast", "text": ""},
            "forecast_3h": {"state": "no_forecast", "text": ""},
        },
        "meta": {
            "engine": SCHEMA_VERSION,
            "relay_version": RELAY_VERSION,
            "sources_used": [],
            "latency_ms": latency_ms,
            "cache": "miss",
            "kernel": KERNEL_VERSION,
            "failure_mode": "safe_error_contract",
        },
        "extensions": {},
    }


def _assert_no_engine_leak(contract: dict[str, Any]) -> None:
    leaked = ENGINE_LEAK_TOP_KEYS.intersection(contract.keys())
    if leaked:
        raise ContractDriftError(f"engine leak keys at top level: {sorted(leaked)}")


def emit_wind_latest_contract(
    engine_envelope: dict[str, Any],
    resolver_payload: dict[str, Any] | None = None,
    *,
    latency_ms: int = 0,
) -> dict[str, Any]:
    """ONLY authorized /wind/latest UX exit — kernel enforces or returns safe error."""
    draft = _build_lock_contract_draft(
        engine_envelope,
        resolver_payload,
        latency_ms=latency_ms,
    )
    try:
        _assert_no_engine_leak(draft)
        return enforce_lock_contract(draft)
    except ContractDriftError:
        safe = build_safe_error_contract(latency_ms=latency_ms)
        _assert_no_engine_leak(safe)
        return enforce_lock_contract(safe)


def kernel_health_flags() -> dict[str, str]:
    return {
        "zero_drift_kernel": KERNEL_VERSION,
        "wind_latest_contract": CONTRACT_VERSION,
    }
