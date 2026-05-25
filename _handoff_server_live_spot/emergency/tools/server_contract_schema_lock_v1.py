#!/usr/bin/env python3
"""SERVER CONTRACT SCHEMA LOCK V1 — authoritative server relay (display + structured fields).

Maps engine envelope (WIND DECISION OUTPUT V1) to UI-safe contract.
Does NOT recalculate wind, kite decisions, or forecast semantics.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from zoneinfo import ZoneInfo

from zero_drift_enforcer_v1 import CONTRACT_VERSION, SCHEMA_VERSION
RELAY_VERSION = "relay_freeze_v1"
PRODUCT_KEY = "WIND DECISION OUTPUT V1"

DIR_DEG_BY_ABBR: dict[str, float] = {
    "N": 0.0,
    "NNE": 22.5,
    "NE": 45.0,
    "ENE": 67.5,
    "E": 90.0,
    "ESE": 112.5,
    "SE": 135.0,
    "SSE": 157.5,
    "S": 180.0,
    "SSW": 202.5,
    "SW": 225.0,
    "WSW": 247.5,
    "W": 270.0,
    "WNW": 292.5,
    "NW": 315.0,
    "NNW": 337.5,
}

ROME = ZoneInfo("Europe/Rome")


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _is_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def _round_kn(value: float) -> float:
    return round(float(value), 1)


def _kn_display_text(value: float | None) -> str | None:
    if value is None:
        return None
    rounded = _round_kn(value)
    if rounded == int(rounded):
        return f"{int(rounded)} kn"
    return f"{rounded} kn"


def _direction_to_deg(value: Any) -> float | None:
    if _is_number(value):
        return float(value) % 360.0
    if not isinstance(value, str):
        return None
    key = value.strip().upper().replace(" ", "")
    return DIR_DEG_BY_ABBR.get(key)


def _format_time_rome(iso_ts: str) -> str:
    if not iso_ts or not str(iso_ts).strip():
        return ""
    raw = str(iso_ts).strip()
    if not raw.endswith("Z") and "+" not in raw[10:]:
        raw = f"{raw}Z"
    try:
        instant = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        if instant.tzinfo is None:
            instant = instant.replace(tzinfo=timezone.utc)
        local = instant.astimezone(ROME)
        return f"{local.hour:02d}:{local.minute:02d}"
    except ValueError:
        return ""


def _display_field(text: str | None, *, present: bool, no_forecast: bool = False) -> dict[str, str]:
    if no_forecast:
        return {"state": "no_forecast", "text": ""}
    if present and text is not None and str(text).strip() != "":
        return {"state": "present", "text": str(text).strip()}
    return {"state": "missing_data", "text": ""}


def _kite_structured(kite_raw: str | None) -> tuple[str, str]:
    text = str(kite_raw or "").strip().upper()
    if text == "GO":
        return "GO", "WIND_OK"
    if text in {"NO GO", "NO_GO"}:
        return "NO_GO", "WIND_LOW"
    if text in {"BORDERLINE", "MARGINAL"}:
        return "MARGINAL", "MODEL_CONFLICT"
    return "UNKNOWN", "UNKNOWN"


def _kite_display(kite_raw: str | None) -> str:
    text = str(kite_raw or "").strip().upper()
    if text == "GO":
        return "GO"
    if text in {"NO GO", "NO_GO"}:
        return "NO GO"
    if text in {"BORDERLINE", "MARGINAL"}:
        return "BORDERLINE"
    return ""


def _spot_source(payload: dict[str, Any]) -> str:
    resolution = payload.get("resolution")
    if isinstance(resolution, dict):
        method = str(resolution.get("method") or "").strip().lower()
        if method in {"alias", "catalog", "known"}:
            return "catalog"
        if method in {"geocode", "geo"}:
            return "geocode"
    if _is_number(payload.get("lat")) and _is_number(payload.get("lon")):
        return "user"
    cache = str(payload.get("cache") or "")
    if "geo" in cache:
        return "geocode"
    return "catalog"


def _wind_source(payload: dict[str, Any]) -> str:
    source_type = str(payload.get("source_type") or "").strip().lower()
    if source_type == "anemometer":
        return "anemometer"
    if source_type in {"forecast", "model"}:
        return "model"
    if payload.get("source"):
        return "hybrid"
    return "model"


def _derive_data_state(
    *,
    has_wind: bool,
    has_direction: bool,
    has_spot: bool,
) -> str:
    if not (has_wind or has_direction or has_spot):
        return "error"
    if has_wind and has_direction and has_spot:
        return "full"
    return "partial"


def _build_lock_contract_draft(
    engine_envelope: dict[str, Any],
    resolver_payload: dict[str, Any] | None = None,
    *,
    latency_ms: int = 0,
) -> dict[str, Any]:
    """Internal builder — must pass through enforce_lock_contract before exit."""
    payload = resolver_payload if isinstance(resolver_payload, dict) else {}
    product = engine_envelope.get(PRODUCT_KEY)
    if not isinstance(product, dict):
        now = _utc_now_iso()
        return {
            "contract_version": CONTRACT_VERSION,
            "schema_version": SCHEMA_VERSION,
            "generated_at": engine_envelope.get("generated_at") or now,
            "updated_at": engine_envelope.get("updated_at") or now,
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
                "1h": {"wind_knots": None, "gust_knots": None, "direction_deg": None},
                "2h": {"wind_knots": None, "gust_knots": None, "direction_deg": None},
                "3h": {"wind_knots": None, "gust_knots": None, "direction_deg": None},
            },
            "decision": {
                "kite": "UNKNOWN",
                "reason_code": "UNKNOWN",
                "confidence": 0.0,
            },
            "display": {
                "wind": _display_field(None, present=False),
                "gust": _display_field(None, present=False),
                "direction": _display_field(None, present=False),
                "wind_name": _display_field(None, present=False),
                "kite_decision": _display_field(None, present=False),
                "reliability": _display_field(None, present=False),
                "spot": _display_field(None, present=False),
                "updated_at": _display_field(None, present=False),
                "forecast_1h": _display_field(None, present=False, no_forecast=True),
                "forecast_2h": _display_field(None, present=False, no_forecast=True),
                "forecast_3h": _display_field(None, present=False, no_forecast=True),
            },
            "meta": {
                "engine": SCHEMA_VERSION,
                "relay_version": RELAY_VERSION,
                "sources_used": [],
                "latency_ms": latency_ms,
                "cache": "miss",
            },
            "extensions": {},
        }

    trend = product.get("WIND TREND (1h / 2h / 3h)")
    if not isinstance(trend, dict):
        trend = {}

    direction_raw = product.get("WIND DIRECTION (kite-relevant)")
    direction_label = (
        str(direction_raw).strip().upper() if isinstance(direction_raw, str) and str(direction_raw).strip() else ""
    )
    direction_deg = _direction_to_deg(direction_raw)

    speed = product.get("WIND NOW (knots)")
    speed_kn = _round_kn(float(speed)) if _is_number(speed) else None
    gust = product.get("GUST NOW (knots)")
    gust_kn = _round_kn(float(gust)) if _is_number(gust) else None

    spot_name = str(product.get("SPOT RESOLVED") or payload.get("spot") or "").strip()
    reliability = str(product.get("RELIABILITY") or "").strip().upper()
    kite_raw = product.get("KITE DECISION")
    kite_struct, reason_code = _kite_structured(
        str(kite_raw).strip() if isinstance(kite_raw, str) else None
    )

    updated_iso = (
        str(product.get("updated_at") or "").strip()
        or str(engine_envelope.get("updated_at") or "").strip()
        or str(engine_envelope.get("generated_at") or "").strip()
        or _utc_now_iso()
    )

    def trend_hour(key: str) -> float | None:
        value = trend.get(key)
        return _round_kn(float(value)) if _is_number(value) else None

    forecast_struct: dict[str, Any] = {}
    for hour in ("1h", "2h", "3h"):
        w = trend_hour(hour)
        forecast_struct[hour] = {
            "wind_knots": w,
            "gust_knots": None,
            "direction_deg": direction_deg,
        }

    display_forecast = {
        "forecast_1h": (
            _display_field(_kn_display_text(trend_hour("1h")), present=True)
            if trend_hour("1h") is not None
            else _display_field(None, present=False, no_forecast=True)
        ),
        "forecast_2h": (
            _display_field(_kn_display_text(trend_hour("2h")), present=True)
            if trend_hour("2h") is not None
            else _display_field(None, present=False, no_forecast=True)
        ),
        "forecast_3h": (
            _display_field(_kn_display_text(trend_hour("3h")), present=True)
            if trend_hour("3h") is not None
            else _display_field(None, present=False, no_forecast=True)
        ),
    }

    has_wind = speed_kn is not None
    has_direction = bool(direction_label) or direction_deg is not None
    has_spot = bool(spot_name)
    data_state = _derive_data_state(
        has_wind=has_wind,
        has_direction=has_direction,
        has_spot=has_spot,
    )

    conf = payload.get("confidence")
    wind_conf = float(conf) if _is_number(conf) else 0.0

    sources_used = payload.get("sources_used")
    if not isinstance(sources_used, list):
        src = payload.get("source")
        sources_used = [src] if src else []

    cache_raw = str(payload.get("cache") or "miss")
    cache_meta = "hit" if "hit" in cache_raw or cache_raw in {"ok", "refreshed"} else "miss"

    display = {
        "wind": _display_field(_kn_display_text(speed_kn), present=speed_kn is not None),
        "gust": _display_field(_kn_display_text(gust_kn), present=gust_kn is not None),
        "direction": _display_field(direction_label or None, present=has_direction),
        "wind_name": _display_field(direction_label or None, present=has_direction),
        "kite_decision": _display_field(_kite_display(str(kite_raw) if isinstance(kite_raw, str) else None), present=bool(_kite_display(str(kite_raw) if isinstance(kite_raw, str) else None))),
        "reliability": _display_field(reliability or None, present=bool(reliability)),
        "spot": _display_field(spot_name or None, present=has_spot),
        "updated_at": _display_field(_format_time_rome(updated_iso), present=bool(_format_time_rome(updated_iso))),
        **display_forecast,
    }

    return {
        "contract_version": CONTRACT_VERSION,
        "schema_version": SCHEMA_VERSION,
        "generated_at": engine_envelope.get("generated_at") or updated_iso,
        "updated_at": engine_envelope.get("updated_at") or updated_iso,
        "data_state": data_state,
        "spot": {
            "name": spot_name,
            "lat": float(payload["lat"]) if _is_number(payload.get("lat")) else None,
            "lon": float(payload["lon"]) if _is_number(payload.get("lon")) else None,
            "source": _spot_source(payload),
            "confidence": wind_conf,
        },
        "wind": {
            "speed_knots": speed_kn,
            "gust_knots": gust_kn,
            "direction_deg": direction_deg,
            "direction_label": direction_label,
            "source": _wind_source(payload),
            "confidence": wind_conf,
        },
        "forecast": forecast_struct,
        "decision": {
            "kite": kite_struct,
            "reason_code": reason_code,
            "confidence": wind_conf,
        },
        "display": display,
        "meta": {
            "engine": SCHEMA_VERSION,
            "relay_version": RELAY_VERSION,
            "sources_used": sources_used,
            "latency_ms": latency_ms,
            "cache": cache_meta,
        },
        "extensions": {},
    }


def build_lock_contract_draft(
    engine_envelope: dict[str, Any],
    resolver_payload: dict[str, Any] | None = None,
    *,
    latency_ms: int = 0,
) -> dict[str, Any]:
    """Internal draft only — MUST pass through zero_drift_kernel_v1 before UX."""
    return _build_lock_contract_draft(engine_envelope, resolver_payload, latency_ms=latency_ms)


__all__ = [
    "CONTRACT_VERSION",
    "SCHEMA_VERSION",
    "RELAY_VERSION",
    "PRODUCT_KEY",
    "build_lock_contract_draft",
    "_build_lock_contract_draft",
]
