#!/usr/bin/env python3
"""V1 CONTRACT EXTENSION — trust final enrichment (additive only).

Pipeline: Wind Decision Output Engine V1 → always-respond (if wired) → THIS LAYER → JSON response.

Adds ONLY when missing:
  - product["GUST NOW (knots)"]
  - product["updated_at"]  (server UTC, never from provider)
  - root["updated_at"]     (server UTC)

Does NOT modify: wind_now, wind_direction, wind_trend, kite_decision, reliability.
Does NOT modify: resolver, providers, cache, DB, engine core, routing.
"""
from __future__ import annotations

import copy
from datetime import datetime, timezone
from typing import Any

PRODUCT_KEY = "WIND DECISION OUTPUT V1"
GUST_KEY = "GUST NOW (knots)"
WIND_NOW_KEY = "WIND NOW (knots)"
GUST_FACTOR_DEFAULT = 1.2


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _is_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def _round_knots(value: float) -> float:
    return round(float(value), 1)


def _gust_from_resolver_payload(payload: dict[str, Any] | None) -> float | None:
    """Read observed gust from resolver/runtime payload only (never overwrites product)."""
    if not payload or not isinstance(payload, dict):
        return None
    for key in ("gust_knots", "gust"):
        if _is_number(payload.get(key)):
            return _round_knots(float(payload[key]))
    source = payload.get("source")
    if isinstance(source, dict):
        for key in ("gust_knots", "gust"):
            if _is_number(source.get(key)):
                return _round_knots(float(source[key]))
    return None


def _wind_now_from_product(product: dict[str, Any]) -> float | None:
    if _is_number(product.get(WIND_NOW_KEY)):
        return float(product[WIND_NOW_KEY])
    trend = product.get("WIND TREND (1h / 2h / 3h)")
    if isinstance(trend, dict):
        for hour in ("1h", "2h", "3h"):
            if _is_number(trend.get(hour)):
                return float(trend[hour])
    return None


def _derive_gust_knots(product: dict[str, Any], source_payload: dict[str, Any] | None) -> float:
    existing = product.get(GUST_KEY)
    if _is_number(existing):
        return _round_knots(float(existing))

    observed = _gust_from_resolver_payload(source_payload)
    if observed is not None:
        return observed

    wind_now = _wind_now_from_product(product)
    if wind_now is None:
        wind_now = 10.0
    return _round_knots(max(wind_now * GUST_FACTOR_DEFAULT, wind_now + 1.0))


def enrich_trust_response(
    output: dict[str, Any],
    source_payload: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Additive V1 extension: gust + updated_at only."""
    if not isinstance(output, dict):
        return output

    enriched = copy.deepcopy(output)
    product = enriched.get(PRODUCT_KEY)
    if not isinstance(product, dict):
        return enriched

    now = _utc_now_iso()

    # --- GUST (informative only; never alters wind_now / kite decision) ---
    if not _is_number(product.get(GUST_KEY)):
        product[GUST_KEY] = _derive_gust_knots(product, source_payload)

    # --- updated_at: server UTC only when adding (never from provider) ---
    if not product.get("updated_at"):
        product["updated_at"] = now
    if not enriched.get("updated_at"):
        enriched["updated_at"] = product.get("updated_at") or now

    meta = enriched.get("trust_enrichment_v1")
    if not isinstance(meta, dict):
        meta = {}
    meta.update(
        {
            "schema_version": "v1_contract_extension_gust_updated_at",
            "applied_at": now,
            "gust_source": (
                "resolver"
                if _gust_from_resolver_payload(source_payload) is not None
                else ("product" if _is_number(product.get(GUST_KEY)) else "estimated")
            ),
            "fields_touched": ["GUST NOW (knots)", "updated_at"],
            "decisional_fields_modified": False,
        }
    )
    enriched["trust_enrichment_v1"] = meta
    enriched[PRODUCT_KEY] = product
    return enriched
