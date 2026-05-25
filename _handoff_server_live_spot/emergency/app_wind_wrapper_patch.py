from __future__ import annotations

import sys
import time
from pathlib import Path
from typing import Any

# tools/*.py use sibling imports (server_contract_schema_lock_v1, etc.)
_TOOLS_DIR = Path(__file__).resolve().parent / "tools"
if str(_TOOLS_DIR) not in sys.path:
    sys.path.insert(0, str(_TOOLS_DIR))

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from cache_db import CATALOG_DB, RUNTIME_DB, init_runtime_db, iso, utc_now
from resolver import LiveSpotResolver
from providers import geocode_candidates
from tools.always_respond_wind_contract_v1 import (
    enforce_always_respond_wind_contract,
    http_status_for_contract,
)
from tools.trust_enrichment_layer_v1 import enrich_trust_response
from tools.zero_drift_kernel_v1 import (
    CONTRACT_VERSION,
    KERNEL_VERSION,
    emit_wind_latest_contract,
    kernel_health_flags,
)


init_runtime_db()

app = FastAPI(title="Live Spot Server", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
)

resolver = LiveSpotResolver()


async def _engine_envelope_from_resolver(payload: dict[str, Any]) -> dict[str, Any]:
    """Internal — never exposed on /wind/latest."""
    output = await enforce_always_respond_wind_contract(payload)
    return enrich_trust_response(output, source_payload=payload)


@app.get("/health")
async def health() -> dict[str, Any]:
    return {
        "ok": True,
        "service": "live_spot_server",
        "catalog_db_exists": CATALOG_DB.is_file(),
        "runtime_db": str(RUNTIME_DB),
        "updated_at": iso(utc_now()),
        "always_respond_wind_contract": "v1",
        "trust_enrichment_layer": "v1",
        "server_contract_schema_lock": "v1",
        "zero_drift_enforcer": "v1",
        **kernel_health_flags(),
    }


@app.get("/wind/latest")
async def wind_latest(
    spot: str = Query("", description="Free-text spot name"),
    lat: float | None = Query(None),
    lon: float | None = Query(None),
) -> JSONResponse:
    started = time.perf_counter()
    payload: dict[str, Any]
    try:
        payload = await resolver.resolve(
            spot,
            confirmed_lat=lat,
            confirmed_lon=lon,
        )
    except Exception:
        payload = {
            "ok": False,
            "input": spot,
            "spot": spot or "Unknown spot",
            "lat": lat,
            "lon": lon,
            "wind_knots": None,
            "gust_knots": None,
            "wind_direction": None,
            "confidence": 0.0,
            "cache": "error_safe_response",
            "updated_at": iso(utc_now()),
        }

    latency_ms = int((time.perf_counter() - started) * 1000)
    engine_envelope = await _engine_envelope_from_resolver(payload)

    lock_contract = emit_wind_latest_contract(
        engine_envelope,
        payload,
        latency_ms=latency_ms,
    )

    if lock_contract.get("data_state") in ("full", "partial"):
        status_code = http_status_for_contract(payload, engine_envelope)
    else:
        status_code = 500

    return JSONResponse(lock_contract, status_code=status_code)


@app.get("/spot/candidates")
async def spot_candidates(q: str = Query("", description="Free-text spot query")) -> dict[str, Any]:
    query = str(q or "").strip()
    if not query:
        return {
            "ok": False,
            "query": query,
            "needs_disambiguation": False,
            "candidates": [],
            "error": "missing_query",
            "updated_at": iso(utc_now()),
        }

    candidates = await geocode_candidates(query, timeout_s=5.0, count=10)
    return {
        "ok": True,
        "query": query,
        "needs_disambiguation": len(candidates) > 1,
        "candidates": candidates,
        "updated_at": iso(utc_now()),
    }


@app.get("/spot/resolve")
async def spot_resolve(spot: str = Query("", description="Free-text spot name")) -> dict[str, Any]:
    return resolver.catalog.resolve(spot)


from wind_trace import build_trace


@app.get("/wind/trace")
async def wind_trace(spot: str = "Is Solinas"):
    result = await resolver.resolve(spot)

    source = result.get("source")
    sources = result.get("sources_used") or ([source] if source else [])
    forecast_rows = [result.get("forecast_1h"), result.get("forecast_2h"), result.get("forecast_3h")]

    l0 = {
        "sources": sources,
        "anemometers_online": 1 if result.get("source_type") == "anemometer" else 0,
        "status": result.get("cache", "ok"),
    }
    l1 = {
        "wind_knots": result.get("wind_knots"),
        "gust_knots": result.get("gust_knots"),
        "winner_source": source,
        "model_divergence": any(bool(row and row.get("forecast_adjusted")) for row in forecast_rows),
    }
    resolution = result.get("resolution") if isinstance(result.get("resolution"), dict) else {}
    l2 = {
        "confidence": result.get("confidence"),
        "method": resolution.get("method"),
        "known": resolution.get("known", True),
    }

    return build_trace(l0, l1, l2)
