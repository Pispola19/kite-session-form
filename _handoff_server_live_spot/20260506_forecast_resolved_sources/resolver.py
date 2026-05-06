from __future__ import annotations

import asyncio
import math
import os
from typing import Any

from cache_db import (
    active_anemometers,
    get_coordinate,
    get_fresh_forecast,
    get_fresh_forecast_by_horizon,
    get_fresh_wind,
    get_latest_wind,
    iso,
    log_request,
    record_unresolved_spot,
    save_coordinate,
    save_forecast_sample,
    save_wind_sample,
    utc_now,
)
from catalog import SpotCatalog, normalize_text
from providers import fetch_anemometer, fetch_ecmwf, fetch_open_meteo, fetch_windy, geocode_place, geocode_candidates


WIND_TTL_SECONDS = int(os.environ.get("LIVE_SPOT_WIND_TTL_SECONDS", "600"))
FORECAST_TTL_SECONDS = int(os.environ.get("LIVE_SPOT_FORECAST_TTL_SECONDS", "1800"))
HTTP_TIMEOUT_SECONDS = float(os.environ.get("LIVE_SPOT_HTTP_TIMEOUT_SECONDS", "2.5"))


def _float_or_none(value: Any) -> float | None:
    try:
        if value is None or value == "":
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _public_wind_from_cache(row: dict[str, Any], *, cache_status: str) -> dict[str, Any]:
    return {
        "ok": True,
        "spot": row.get("canonical_spot"),
        "lat": row.get("lat"),
        "lon": row.get("lon"),
        "wind_knots": row.get("wind_knots"),
        "gust_knots": row.get("gust_knots"),
        "wind_direction": row.get("wind_direction"),
        "source": row.get("source_name"),
        "source_type": row.get("source_type"),
        "confidence": row.get("confidence"),
        "observed_at": row.get("observed_at"),
        "updated_at": row.get("fetched_at"),
        "cache": cache_status,
    }


def _weighted_direction(samples: list[dict[str, Any]]) -> float | None:
    sum_x = 0.0
    sum_y = 0.0
    for sample in samples:
        direction = _float_or_none(sample.get("wind_direction"))
        confidence = _float_or_none(sample.get("confidence")) or 0.0
        if direction is None or confidence <= 0:
            continue
        radians = math.radians(direction)
        sum_x += math.cos(radians) * confidence
        sum_y += math.sin(radians) * confidence
    if sum_x == 0 and sum_y == 0:
        return None
    return round((math.degrees(math.atan2(sum_y, sum_x)) + 360) % 360)


def _resolve_samples(samples: list[dict[str, Any]]) -> dict[str, Any] | None:
    usable = [s for s in samples if _float_or_none(s.get("wind_knots")) is not None]
    if not usable:
        return None

    preliminary = sum(float(s["wind_knots"]) for s in usable) / len(usable)
    filtered = [s for s in usable if abs(float(s["wind_knots"]) - preliminary) <= 10]
    if not filtered:
        filtered = usable

    anemometers = [s for s in filtered if str(s.get("source_type") or "").lower() == "anemometer"]
    if anemometers:
        best_source = sorted(anemometers, key=lambda s: _float_or_none(s.get("confidence")) or 0, reverse=True)[0]
        gust_values = [_float_or_none(s.get("gust_knots")) for s in filtered]
        gust_values = [v for v in gust_values if v is not None]
        return {
            "source_name": best_source.get("source_name"),
            "source_type": best_source.get("source_type"),
            "wind_knots": round(float(best_source["wind_knots"]), 1),
            "gust_knots": round(max(gust_values), 1) if gust_values else _float_or_none(best_source.get("gust_knots")),
            "wind_direction": _float_or_none(best_source.get("wind_direction")),
            "observed_at": best_source.get("observed_at"),
            "confidence": _float_or_none(best_source.get("confidence")) or 0.7,
            "sources_used": [str(s.get("source_name")) for s in filtered if s.get("source_name")],
            "raw_payload": {"samples": [s.get("raw_payload") for s in filtered]},
        }

    weight_total = sum((_float_or_none(s.get("confidence")) or 0.1) for s in filtered)
    if weight_total <= 0:
        weight_total = float(len(filtered))
    wind = sum(float(s["wind_knots"]) * ((_float_or_none(s.get("confidence")) or 0.1)) for s in filtered) / weight_total
    gust_values = [_float_or_none(s.get("gust_knots")) for s in filtered]
    gust_values = [v for v in gust_values if v is not None]
    best_source = sorted(filtered, key=lambda s: _float_or_none(s.get("confidence")) or 0, reverse=True)[0]
    return {
        "source_name": best_source.get("source_name"),
        "source_type": best_source.get("source_type"),
        "wind_knots": round(wind, 1),
        "gust_knots": round(max(gust_values), 1) if gust_values else None,
        "wind_direction": _weighted_direction(filtered),
        "observed_at": best_source.get("observed_at"),
        "confidence": round(min(1.0, weight_total / max(1, len(filtered))), 2),
        "sources_used": [str(s.get("source_name")) for s in filtered if s.get("source_name")],
        "raw_payload": {"samples": [s.get("raw_payload") for s in filtered]},
    }


def _resolve_forecast_samples(samples: list[dict[str, Any]], horizon_minutes: int) -> dict[str, Any] | None:
    """Resolve forecast from model forecasts only. Anemometers are excluded by design."""
    candidates: list[dict[str, Any]] = []
    for sample in samples:
        if str(sample.get("source_type") or "").lower() == "anemometer":
            continue
        source_name = str(sample.get("source_name") or "unknown")
        source_confidence = _float_or_none(sample.get("confidence")) or 0.5
        forecasts = sample.get("forecasts")
        if not isinstance(forecasts, list):
            forecast = sample.get("forecast")
            forecasts = [forecast] if isinstance(forecast, dict) else []
        for forecast in forecasts:
            if not isinstance(forecast, dict):
                continue
            if int(forecast.get("horizon_minutes") or 180) != horizon_minutes:
                continue
            wind = _float_or_none(forecast.get("wind_knots"))
            if wind is None:
                continue
            candidate = dict(forecast)
            candidate["source_name"] = source_name
            candidate["confidence"] = source_confidence
            candidates.append(candidate)

    if not candidates:
        return None

    preliminary = sum(float(c["wind_knots"]) for c in candidates) / len(candidates)
    filtered = [c for c in candidates if abs(float(c["wind_knots"]) - preliminary) <= 10]
    if not filtered:
        filtered = candidates

    weight_total = sum((_float_or_none(c.get("confidence")) or 0.1) for c in filtered)
    if weight_total <= 0:
        weight_total = float(len(filtered))

    wind = sum(float(c["wind_knots"]) * ((_float_or_none(c.get("confidence")) or 0.1)) for c in filtered) / weight_total
    gust_values = [_float_or_none(c.get("gust_knots")) for c in filtered]
    gust_values = [v for v in gust_values if v is not None]
    best_source = sorted(filtered, key=lambda c: _float_or_none(c.get("confidence")) or 0, reverse=True)[0]

    divergence = max(float(c["wind_knots"]) for c in filtered) - min(float(c["wind_knots"]) for c in filtered)
    confidence = min(1.0, weight_total / max(1, len(filtered)))
    if divergence >= 8:
        confidence *= 0.55
    elif divergence >= 5:
        confidence *= 0.75

    return {
        "source_name": "forecast_resolved",
        "source_type": "forecast_ensemble",
        "wind_knots": round(wind, 1),
        "gust_knots": round(max(gust_values), 1) if gust_values else None,
        "wind_direction": _weighted_direction(filtered),
        "forecast_at": best_source.get("forecast_at"),
        "fetched_at": iso(utc_now()),
        "confidence": round(confidence, 2),
        "sources_used": [str(c.get("source_name")) for c in filtered if c.get("source_name")],
        "model_divergence_knots": round(divergence, 1),
    }


class LiveSpotResolver:
    def __init__(self) -> None:
        self.catalog = SpotCatalog()

    async def resolve(self, raw_spot: str, confirmed_lat: float | None = None, confirmed_lon: float | None = None) -> dict[str, Any]:
        raw = str(raw_spot or "").strip()
        resolved = self.catalog.resolve(raw)
        canonical = resolved.get("canonical_spot") or raw
        normalized = resolved.get("normalized_input") or normalize_text(raw)

        if not raw:
            return {"ok": False, "error": "missing_spot", "updated_at": iso(utc_now())}

        method = str(resolved.get("method") or "")
        confidence = _float_or_none(resolved.get("confidence")) or 0.0
        has_confirmed_coordinates = confirmed_lat is not None and confirmed_lon is not None
        geo_unsafe = ((not bool(resolved.get("known"))) or method == "world_geocode" or confidence < 0.5 or method == "fuzzy") and not has_confirmed_coordinates
        if geo_unsafe:
            record_unresolved_spot(
                raw_input=raw,
                normalized_input=normalized,
                notes=f"auto from wind/latest: method={method} confidence={confidence}",
                suggested_name=resolved.get("canonical_spot") if method in ("fuzzy",) else None,
                suggested_score=confidence if method in ("fuzzy",) else None,
            )

            candidates = await geocode_candidates(canonical, timeout_s=HTTP_TIMEOUT_SECONDS, count=10)
            if len(candidates) > 1:
                return {
                    "ok": True,
                    "input": raw,
                    "spot": canonical,
                    "wind_knots": None,
                    "gust_knots": None,
                    "wind_direction": None,
                    "source": None,
                    "cache": "needs_geo_disambiguation",
                    "needs_disambiguation": True,
                    "candidates": candidates,
                    "resolution": resolved,
                    "updated_at": iso(utc_now()),
                }

        fresh = None if has_confirmed_coordinates else get_fresh_wind(canonical)
        fresh_forecast = None if has_confirmed_coordinates else get_fresh_forecast(canonical)
        fresh_forecast_1h = None if has_confirmed_coordinates else get_fresh_forecast_by_horizon(canonical, 60)
        fresh_forecast_2h = None if has_confirmed_coordinates else get_fresh_forecast_by_horizon(canonical, 120)
        fresh_forecast_3h = None if has_confirmed_coordinates else (get_fresh_forecast_by_horizon(canonical, 180) or fresh_forecast)
        # Forecast must be resolved from current model samples, not from the last cached provider row.
        # Therefore, a fresh NOW cache is not returned early when coordinates are available.
        if fresh and has_confirmed_coordinates:
            payload = _public_wind_from_cache(fresh, cache_status="fresh")
            payload.update({"input": raw, "resolution": resolved, "forecast_1h": _forecast_payload(fresh_forecast_1h, "1h"), "forecast_2h": _forecast_payload(fresh_forecast_2h, "2h"), "forecast_3h": _forecast_payload(fresh_forecast_3h, "3h")})
            log_request(raw, canonical, "fresh", True, None)
            return payload

        lat = _float_or_none(resolved.get("lat"))
        lon = _float_or_none(resolved.get("lon"))
        coord_source = "catalog"

        if has_confirmed_coordinates:
            lat = _float_or_none(confirmed_lat)
            lon = _float_or_none(confirmed_lon)
            coord_source = "user_confirmed"
            resolved = dict(resolved)
            resolved["lat"] = lat
            resolved["lon"] = lon
            resolved["known"] = True
            resolved["method"] = coord_source
            resolved["confidence"] = 1.0
        if lat is None or lon is None:
            cached_coord = get_coordinate(normalized)
            if cached_coord:
                lat = _float_or_none(cached_coord.get("lat"))
                lon = _float_or_none(cached_coord.get("lon"))
                coord_source = str(cached_coord.get("source") or "coordinate_cache")
                resolved = dict(resolved)
                resolved["lat"] = lat
                resolved["lon"] = lon
                resolved["known"] = True
                resolved["method"] = coord_source

        if lat is None or lon is None:
            geocoded = await geocode_place(canonical, timeout_s=HTTP_TIMEOUT_SECONDS)
            if geocoded:
                lat = geocoded["lat"]
                lon = geocoded["lon"]
                coord_source = "open-meteo-geocoding"
                save_coordinate(
                    normalized_input=normalized,
                    canonical_spot=canonical,
                    lat=lat,
                    lon=lon,
                    source=coord_source,
                    resolved_name=geocoded.get("resolved_name"),
                )

        stale = get_latest_wind(canonical)
        if lat is None or lon is None:
            if stale:
                payload = _public_wind_from_cache(stale, cache_status="stale_no_coordinates")
                payload.update({"input": raw, "resolution": resolved, "forecast_1h": _forecast_payload(fresh_forecast_1h, "1h"), "forecast_2h": _forecast_payload(fresh_forecast_2h, "2h"), "forecast_3h": _forecast_payload(fresh_forecast_3h, "3h")})
                log_request(raw, canonical, "stale_no_coordinates", True, None)
                return payload
            payload = {
                "ok": True,
                "input": raw,
                "spot": canonical,
                "lat": None,
                "lon": None,
                "wind_knots": None,
                "gust_knots": None,
                "wind_direction": None,
                "source": None,
                "cache": "miss_no_coordinates",
                "resolution": resolved,
                "updated_at": iso(utc_now()),
            }
            log_request(raw, canonical, "miss_no_coordinates", True, "coordinates_unavailable")
            return payload

        provider_tasks = [
            *(fetch_anemometer(station, timeout_s=HTTP_TIMEOUT_SECONDS) for station in active_anemometers(canonical)),
            fetch_windy(lat, lon, timeout_s=HTTP_TIMEOUT_SECONDS),
            fetch_open_meteo(lat, lon, timeout_s=HTTP_TIMEOUT_SECONDS),
            fetch_ecmwf(lat, lon, timeout_s=HTTP_TIMEOUT_SECONDS),
        ]
        results = await asyncio.gather(*provider_tasks, return_exceptions=True)
        samples = [r for r in results if isinstance(r, dict)]

        for sample in samples:
            source_name = str(sample.get("source_name") or "unknown")
            save_wind_sample(
                cache_key=f"wind:{canonical}:{source_name}",
                canonical_spot=canonical,
                raw_input=raw,
                lat=lat,
                lon=lon,
                source_name=source_name,
                source_type=str(sample.get("source_type") or "weather_api"),
                wind_knots=_float_or_none(sample.get("wind_knots")),
                gust_knots=_float_or_none(sample.get("gust_knots")),
                wind_direction=_float_or_none(sample.get("wind_direction")),
                observed_at=sample.get("observed_at"),
                confidence=_float_or_none(sample.get("confidence")) or 0.5,
                raw_payload=sample.get("raw_payload") if isinstance(sample.get("raw_payload"), dict) else {},
                ttl_seconds=WIND_TTL_SECONDS,
            )
            forecasts = sample.get("forecasts")
            if not isinstance(forecasts, list):
                forecast = sample.get("forecast")
                forecasts = [forecast] if isinstance(forecast, dict) else []
            for forecast in forecasts:
                if not isinstance(forecast, dict):
                    continue
                horizon_minutes = int(forecast.get("horizon_minutes") or 180)
                save_forecast_sample(
                    cache_key=f"forecast:{canonical}:{source_name}:{horizon_minutes}",
                    canonical_spot=canonical,
                    raw_input=raw,
                    lat=lat,
                    lon=lon,
                    horizon_minutes=horizon_minutes,
                    wind_knots=_float_or_none(forecast.get("wind_knots")),
                    gust_knots=_float_or_none(forecast.get("gust_knots")),
                    wind_direction=_float_or_none(forecast.get("wind_direction")),
                    forecast_at=forecast.get("forecast_at"),
                    source_name=source_name,
                    raw_payload=sample.get("raw_payload") if isinstance(sample.get("raw_payload"), dict) else {},
                    ttl_seconds=FORECAST_TTL_SECONDS,
                )

        best = _resolve_samples(samples)
        latest_forecast = get_fresh_forecast(canonical)
        latest_forecast_1h = _resolve_forecast_samples(samples, 60) or get_fresh_forecast_by_horizon(canonical, 60)
        latest_forecast_2h = _resolve_forecast_samples(samples, 120) or get_fresh_forecast_by_horizon(canonical, 120)
        latest_forecast_3h = _resolve_forecast_samples(samples, 180) or get_fresh_forecast_by_horizon(canonical, 180) or latest_forecast
        if best:
            best["source_name"] = "resolved"
            save_wind_sample(
                cache_key=f"wind:{canonical}:resolved",
                canonical_spot=canonical,
                raw_input=raw,
                lat=lat,
                lon=lon,
                source_name="resolved",
                source_type="derived",
                wind_knots=_float_or_none(best.get("wind_knots")),
                gust_knots=_float_or_none(best.get("gust_knots")),
                wind_direction=_float_or_none(best.get("wind_direction")),
                observed_at=best.get("observed_at"),
                confidence=_float_or_none(best.get("confidence")) or 0.5,
                raw_payload=best.get("raw_payload") if isinstance(best.get("raw_payload"), dict) else {},
                ttl_seconds=WIND_TTL_SECONDS,
            )
            payload = {
                "ok": True,
                "input": raw,
                "spot": canonical,
                "lat": lat,
                "lon": lon,
                "coordinate_source": coord_source,
                "wind_knots": best.get("wind_knots"),
                "gust_knots": best.get("gust_knots"),
                "wind_direction": best.get("wind_direction"),
                "source": "resolved",
                "source_type": "derived",
                "sources_used": best.get("sources_used") or [],
                "confidence": best.get("confidence"),
                "observed_at": best.get("observed_at"),
                "updated_at": iso(utc_now()),
                "cache": "refreshed",
                "resolution": resolved,
                "forecast_1h": _forecast_payload(latest_forecast_1h, "1h"),
                "forecast_2h": _forecast_payload(latest_forecast_2h, "2h"),
                "forecast_3h": _forecast_payload(latest_forecast_3h, "3h"),
            }
            log_request(raw, canonical, "refreshed", True, None)
            return payload

        if stale:
            payload = _public_wind_from_cache(stale, cache_status="stale_api_failed")
            payload.update({
                "input": raw,
                "resolution": resolved,
                "forecast_1h": _forecast_payload(latest_forecast_1h if "latest_forecast_1h" in locals() else fresh_forecast_1h, "1h"),
            "forecast_2h": _forecast_payload(latest_forecast_2h if "latest_forecast_2h" in locals() else fresh_forecast_2h, "2h"),
            "forecast_3h": _forecast_payload((latest_forecast_3h if "latest_forecast_3h" in locals() else None) or (latest_forecast or fresh_forecast), "3h"),
            })
            log_request(raw, canonical, "stale_api_failed", True, None)
            return payload

        payload = {
            "ok": True,
            "input": raw,
            "spot": canonical,
            "lat": lat,
            "lon": lon,
            "coordinate_source": coord_source,
            "wind_knots": None,
            "gust_knots": None,
            "wind_direction": None,
            "source": None,
            "cache": "miss_api_failed",
            "resolution": resolved,
            "forecast_1h": _forecast_payload(latest_forecast_1h if "latest_forecast_1h" in locals() else fresh_forecast_1h, "1h"),
            "forecast_2h": _forecast_payload(latest_forecast_2h if "latest_forecast_2h" in locals() else fresh_forecast_2h, "2h"),
            "forecast_3h": _forecast_payload((latest_forecast_3h if "latest_forecast_3h" in locals() else None) or (latest_forecast or fresh_forecast), "3h"),
            "updated_at": iso(utc_now()),
        }
        log_request(raw, canonical, "miss_api_failed", True, "api_failed")
        return payload


def _forecast_payload(row: dict[str, Any] | None, label: str = "3h") -> dict[str, Any] | None:
    if not row:
        return None
    return {
        "label": label,
        "wind_knots": row.get("wind_knots"),
        "gust_knots": row.get("gust_knots"),
        "wind_direction": row.get("wind_direction"),
        "forecast_at": row.get("forecast_at"),
        "updated_at": row.get("fetched_at"),
        "source": row.get("source_name"),
    }
