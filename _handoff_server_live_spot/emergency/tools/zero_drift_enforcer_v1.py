#!/usr/bin/env python3
"""ZERO DRIFT ENFORCER V1 — rigid validation for SERVER CONTRACT SCHEMA LOCK V1."""
from __future__ import annotations

from typing import Any

CONTRACT_VERSION = "server_contract_schema_lock_v1"
SCHEMA_VERSION = "wind_decision_output_engine_v1"
PRODUCT_KEY = "WIND DECISION OUTPUT V1"

ALLOWED_TOP_LEVEL_KEYS = frozenset(
    {
        "contract_version",
        "schema_version",
        "generated_at",
        "updated_at",
        "data_state",
        "spot",
        "wind",
        "forecast",
        "decision",
        "display",
        "meta",
        "extensions",
    }
)

VALID_DATA_STATES = frozenset(
    {"idle", "fetching", "full", "partial", "error", "no_forecast"}
)

REQUIRED_DISPLAY_KEYS = (
    "wind",
    "gust",
    "direction",
    "wind_name",
    "kite_decision",
    "reliability",
    "spot",
    "updated_at",
    "forecast_1h",
    "forecast_2h",
    "forecast_3h",
)

VALID_DISPLAY_STATES = frozenset({"present", "missing_data", "no_forecast"})

FORECAST_HOURS = ("1h", "2h", "3h")

FORECAST_SLOT_KEYS = frozenset({"wind_knots", "gust_knots", "direction_deg"})


class ContractDriftError(ValueError):
    """Raised when a response violates SERVER CONTRACT SCHEMA LOCK V1."""


def _is_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def validate_lock_contract(contract: Any) -> list[str]:
    """Return validation errors (empty list = valid)."""
    errors: list[str] = []

    if not isinstance(contract, dict):
        return ["contract must be a dict"]

    extra_top = set(contract.keys()) - ALLOWED_TOP_LEVEL_KEYS
    if extra_top:
        errors.append(f"forbidden top-level keys: {sorted(extra_top)}")

    engine_leak_keys = {
        PRODUCT_KEY,
        "wind_knots",
        "wind_kt",
        "wind_direction",
        "gust_knots",
        "guardrails",
        "trust_enrichment_v1",
    }
    leaked = engine_leak_keys.intersection(contract.keys())
    if leaked:
        errors.append(f"engine leak at top level: {sorted(leaked)}")

    if contract.get("contract_version") != CONTRACT_VERSION:
        errors.append(
            f"contract_version must be {CONTRACT_VERSION!r}, got {contract.get('contract_version')!r}"
        )

    if contract.get("schema_version") != SCHEMA_VERSION:
        errors.append(
            f"schema_version must be {SCHEMA_VERSION!r}, got {contract.get('schema_version')!r}"
        )

    for ts_key in ("generated_at", "updated_at"):
        ts_val = contract.get(ts_key)
        if not isinstance(ts_val, str) or not ts_val.strip():
            errors.append(f"{ts_key} must be non-empty ISO string")

    data_state = contract.get("data_state")
    if data_state is None:
        errors.append("data_state is required")
    elif data_state not in VALID_DATA_STATES:
        errors.append(f"data_state invalid: {data_state!r}")

    display = contract.get("display")
    if not isinstance(display, dict):
        errors.append("display must be an object")
    else:
        for key in REQUIRED_DISPLAY_KEYS:
            if key not in display:
                errors.append(f"display.{key} missing")
        for key, field in display.items():
            if not isinstance(field, dict):
                errors.append(f"display.{key} must be {{state, text}}")
                continue
            state = field.get("state")
            if state not in VALID_DISPLAY_STATES:
                errors.append(f"display.{key}.state invalid: {state!r}")
            if "text" not in field or not isinstance(field.get("text"), str):
                errors.append(f"display.{key}.text must be string")

    forecast = contract.get("forecast")
    if not isinstance(forecast, dict):
        errors.append("forecast must be an object")
    else:
        forecast_keys = set(forecast.keys())
        if forecast_keys != set(FORECAST_HOURS):
            errors.append(f"forecast keys must be {list(FORECAST_HOURS)}, got {sorted(forecast_keys)}")
        for hour in FORECAST_HOURS:
            slot = forecast.get(hour)
            if not isinstance(slot, dict):
                errors.append(f"forecast.{hour} must be an object")
                continue
            slot_keys = set(slot.keys())
            if slot_keys != FORECAST_SLOT_KEYS:
                errors.append(
                    f"forecast.{hour} keys must be {sorted(FORECAST_SLOT_KEYS)}, got {sorted(slot_keys)}"
                )

    wind = contract.get("wind")
    if not isinstance(wind, dict):
        errors.append("wind must be an object")
    else:
        for key in (
            "speed_knots",
            "gust_knots",
            "direction_deg",
            "direction_label",
            "source",
            "confidence",
        ):
            if key not in wind:
                errors.append(f"wind.{key} missing")

    spot = contract.get("spot")
    if not isinstance(spot, dict):
        errors.append("spot must be an object")
    else:
        for key in ("name", "lat", "lon", "source", "confidence"):
            if key not in spot:
                errors.append(f"spot.{key} missing")

    decision = contract.get("decision")
    if not isinstance(decision, dict):
        errors.append("decision must be an object")
    else:
        for key in ("kite", "reason_code", "confidence"):
            if key not in decision:
                errors.append(f"decision.{key} missing")

    meta = contract.get("meta")
    if not isinstance(meta, dict):
        errors.append("meta must be an object")
    else:
        for key in ("engine", "relay_version", "sources_used", "latency_ms", "cache"):
            if key not in meta:
                errors.append(f"meta.{key} missing")

    extensions = contract.get("extensions")
    if extensions is None or not isinstance(extensions, dict):
        errors.append("extensions must be an object")

    return errors


def enforce_lock_contract(contract: dict[str, Any]) -> dict[str, Any]:
    """Validate contract; raise ContractDriftError if invalid."""
    errors = validate_lock_contract(contract)
    if errors:
        raise ContractDriftError("; ".join(errors))
    return contract


def reject_if_drift(contract: dict[str, Any]) -> dict[str, Any]:
    """Alias for enforce — explicit guardrail name."""
    return enforce_lock_contract(contract)
