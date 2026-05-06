from __future__ import annotations

import math
import os
from typing import Any

import httpx

from wind_normalizer import normalize_direction_to_degrees, normalize_speed_to_knots


OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
OPEN_METEO_ECMWF_URL = "https://api.open-meteo.com/v1/ecmwf"
OPEN_METEO_GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
WINDY_ENDPOINT = "https://api.windy.com/api/point-forecast/v2"
MS_TO_KNOTS = 1.94384


def _first(source: dict[str, Any], keys: list[str]) -> Any:
    for key in keys:
        value = source.get(key)
        if value is not None and value != "":
            return value
    return None


def _number(value: Any) -> float | None:
    try:
        if value is None or value == "":
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


async def geocode_place(name: str, *, timeout_s: float) -> dict[str, Any] | None:
    query = str(name or "").strip()
    if not query:
        return None
    try:
        async with httpx.AsyncClient(timeout=timeout_s) as client:
            response = await client.get(
                OPEN_METEO_GEOCODING_URL,
                params={"name": query, "count": 1, "language": "en", "format": "json"},
            )
            response.raise_for_status()
            payload = response.json()
    except Exception:
        return None

    results = payload.get("results") if isinstance(payload, dict) else None
    if not results or not isinstance(results[0], dict):
        return None
    item = results[0]
    lat = _number(item.get("latitude"))
    lon = _number(item.get("longitude"))
    if lat is None or lon is None:
        return None
    if not (-90 <= lat <= 90 and -180 <= lon <= 180):
        return None
    resolved_name = item.get("name") or query
    return {
        "lat": lat,
        "lon": lon,
        "resolved_name": str(resolved_name),
        "raw_payload": payload,
    }


async def geocode_candidates(name: str, *, timeout_s: float, count: int = 10) -> list[dict[str, Any]]:
    query = str(name or "").strip()
    if not query:
        return []

    # Search broad, do not decide for the user.
    # Native/local names often matter more than UI language:
    # Napoli, Yyteri, Grado, El Médano, Le Morne, etc.
    aliases = {
        "napoli": ["Naples", "Nápoles"],
        "naples": ["Napoli", "Nápoles"],
        "napoles": ["Napoli", "Naples", "Nápoles"],
        "nápoles": ["Napoli", "Naples"],
        "roma": ["Rome"],
        "rome": ["Roma"],
        "venezia": ["Venice"],
        "venice": ["Venezia"],
        "firenze": ["Florence"],
        "florence": ["Firenze"],
    }

    query_key = query.lower().strip()
    query_variants = [query]
    for alias in aliases.get(query_key, []):
        if alias not in query_variants:
            query_variants.append(alias)

    languages = ["en", "it", "de", "es", "fr"]
    raw_results: list[tuple[dict[str, Any], str, str, int]] = []

    try:
        async with httpx.AsyncClient(timeout=timeout_s) as client:
            for query_variant in query_variants:
                for language in languages:
                    response = await client.get(
                        OPEN_METEO_GEOCODING_URL,
                        params={
                            "name": query_variant,
                            "count": count,
                            "language": language,
                            "format": "json",
                        },
                    )
                    response.raise_for_status()
                    payload = response.json()
                    results = payload.get("results") if isinstance(payload, dict) else None
                    if not isinstance(results, list):
                        continue
                    for idx, item in enumerate(results, 1):
                        if isinstance(item, dict):
                            raw_results.append((item, query_variant, language, idx))
    except Exception:
        return []

    dedup: dict[str, dict[str, Any]] = {}

    for item, query_variant, language, source_rank in raw_results:
        lat = _number(item.get("latitude"))
        lon = _number(item.get("longitude"))
        if lat is None or lon is None:
            continue
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            continue

        geoname_id = item.get("id")
        key = str(geoname_id) if geoname_id is not None else f"{round(lat, 5)}:{round(lon, 5)}:{item.get('name')}"
        name_value = str(item.get("name") or query_variant)
        country_code = item.get("country_code")
        country = item.get("country")
        admin1 = item.get("admin1")
        admin2 = item.get("admin2")
        population = _number(item.get("population")) or 0

        parts = [name_value]
        if country_code:
            parts.append(f"({country_code})")
        area_parts = [p for p in [admin1, admin2] if p]
        if area_parts:
            parts.append("— " + " / ".join(str(p) for p in area_parts))

        exact_name_bonus = 0.0
        if name_value.lower() == query.lower():
            exact_name_bonus = 0.25
        elif name_value.lower() in [v.lower() for v in query_variants]:
            exact_name_bonus = 0.18

        native_language_bonus = 0.08 if language in ("it", "en") else 0.0
        population_bonus = min(0.25, population / 1000000 * 0.25) if population else 0.0
        source_rank_score = max(0.0, 1.0 - ((source_rank - 1) * 0.08))

        score = source_rank_score + exact_name_bonus + native_language_bonus + population_bonus

        candidate = {
            "rank": 0,
            "label": " ".join(parts),
            "name": name_value,
            "country_code": country_code,
            "country": country,
            "admin1": admin1,
            "admin2": admin2,
            "lat": lat,
            "lon": lon,
            "source": "open-meteo-geocoding",
            "geo_confidence": round(max(0.2, min(1.0, score)), 2),
            "query_variant": query_variant,
            "language": language,
            "population": int(population) if population else None,
            "raw": item,
            "_score": score,
        }

        existing = dedup.get(key)
        if existing is None or candidate["_score"] > existing["_score"]:
            dedup[key] = candidate

    candidates = sorted(
        dedup.values(),
        key=lambda c: (
            -float(c.get("_score") or 0),
            0 if c.get("country_code") == "IT" and str(c.get("name", "")).lower() == query.lower() else 1,
            str(c.get("label") or ""),
        ),
    )[:count]

    for idx, candidate in enumerate(candidates, 1):
        candidate["rank"] = idx
        candidate.pop("_score", None)

    return candidates




async def fetch_ecmwf(lat: float, lon: float, *, timeout_s: float) -> dict[str, Any] | None:
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "wind_speed_10m,wind_direction_10m,wind_gusts_10m",
        "hourly": "wind_speed_10m,wind_direction_10m,wind_gusts_10m",
        "forecast_hours": 6,
        "wind_speed_unit": "kn",
        "timezone": "UTC",
    }
    try:
        async with httpx.AsyncClient(timeout=timeout_s) as client:
            response = await client.get(OPEN_METEO_ECMWF_URL, params=params)
            response.raise_for_status()
            payload = response.json()
    except Exception:
        return None

    current = payload.get("current") or {}
    hourly = payload.get("hourly") or {}
    times = hourly.get("time") or []
    speeds = hourly.get("wind_speed_10m") or []
    dirs = hourly.get("wind_direction_10m") or []
    gusts = hourly.get("wind_gusts_10m") or []

    current_time = current.get("time")
    wind_knots = _number(current.get("wind_speed_10m"))
    direction = _number(current.get("wind_direction_10m"))
    gust = _number(current.get("wind_gusts_10m"))

    if wind_knots is None and len(times) > 0 and len(speeds) > 0:
        current_time = times[0]
        wind_knots = _number(speeds[0])
        direction = _number(dirs[0]) if len(dirs) > 0 else None
        gust = _number(gusts[0]) if len(gusts) > 0 else None

    forecasts = []
    for idx, horizon_minutes in ((1, 60), (2, 120), (3, 180)):
        if len(times) > idx and len(speeds) > idx:
            forecasts.append({
                "horizon_minutes": horizon_minutes,
                "forecast_at": times[idx],
                "wind_knots": _number(speeds[idx]),
                "gust_knots": _number(gusts[idx]) if len(gusts) > idx else None,
                "wind_direction": _number(dirs[idx]) if len(dirs) > idx else None,
            })

    if wind_knots is None and not forecasts:
        return None

    return {
        "source_name": "ecmwf",
        "source_type": "forecast_model",
        "wind_knots": wind_knots,
        "gust_knots": gust,
        "wind_direction": direction,
        "observed_at": current_time,
        "confidence": 0.60,
        "forecast": forecasts[2] if len(forecasts) >= 3 else (forecasts[-1] if forecasts else None),
        "forecasts": forecasts,
        "raw_payload": payload,
    }


async def fetch_open_meteo(lat: float, lon: float, *, timeout_s: float) -> dict[str, Any] | None:
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "wind_speed_10m,wind_direction_10m,wind_gusts_10m",
        "hourly": "wind_speed_10m,wind_direction_10m,wind_gusts_10m",
        "forecast_hours": 6,
        "wind_speed_unit": "kn",
        "timezone": "UTC",
    }
    try:
        async with httpx.AsyncClient(timeout=timeout_s) as client:
            response = await client.get(OPEN_METEO_FORECAST_URL, params=params)
            response.raise_for_status()
            payload = response.json()
    except Exception:
        return None

    current = payload.get("current") or {}
    current_time = current.get("time")
    wind_knots = _number(current.get("wind_speed_10m"))
    direction = _number(current.get("wind_direction_10m"))
    gust = _number(current.get("wind_gusts_10m"))

    if wind_knots is None and payload.get("current_weather"):
        legacy = payload["current_weather"]
        wind_knots = _number(legacy.get("windspeed"))
        direction = _number(legacy.get("winddirection"))
        current_time = legacy.get("time") or current_time

    forecasts = []
    hourly = payload.get("hourly") or {}
    times = hourly.get("time") or []
    speeds = hourly.get("wind_speed_10m") or []
    dirs = hourly.get("wind_direction_10m") or []
    gusts = hourly.get("wind_gusts_10m") or []
    for idx, horizon_minutes in ((1, 60), (2, 120), (3, 180)):
        if len(times) > idx and len(speeds) > idx:
            forecasts.append({
                "horizon_minutes": horizon_minutes,
                "forecast_at": times[idx],
                "wind_knots": _number(speeds[idx]),
                "gust_knots": _number(gusts[idx]) if len(gusts) > idx else None,
                "wind_direction": _number(dirs[idx]) if len(dirs) > idx else None,
            })

    if wind_knots is None and not forecasts:
        return None

    return {
        "source_name": "open-meteo",
        "source_type": "weather_api",
        "wind_knots": wind_knots,
        "gust_knots": gust,
        "wind_direction": direction,
        "observed_at": current_time,
        "confidence": 0.55,
        "forecast": forecasts[2] if len(forecasts) >= 3 else (forecasts[-1] if forecasts else None),
        "forecasts": forecasts,
        "raw_payload": payload,
    }


async def fetch_windy(lat: float, lon: float, *, timeout_s: float) -> dict[str, Any] | None:
    api_key = os.environ.get("WINDY_API_KEY", "").strip()
    if not api_key:
        return None
    try:
        async with httpx.AsyncClient(timeout=timeout_s) as client:
            response = await client.post(
                WINDY_ENDPOINT,
                json={
                    "lat": lat,
                    "lon": lon,
                    "model": "gfs",
                    "parameters": ["wind"],
                    "levels": ["surface"],
                    "key": api_key,
                },
            )
            response.raise_for_status()
            payload = response.json()
    except Exception:
        return None

    warning = str(payload.get("warning") or "").lower()
    if "testing api" in warning or "randomly shuffled" in warning or "slightly modified" in warning:
        return None

    wind_u = payload.get("wind_u-surface") or []
    wind_v = payload.get("wind_v-surface") or []
    if not wind_u or not wind_v:
        return None
    try:
        u = float(wind_u[0])
        v = float(wind_v[0])
    except (TypeError, ValueError):
        return None
    speed_ms = math.sqrt((u * u) + (v * v))
    direction = (270 - math.degrees(math.atan2(v, u))) % 360
    timestamps = payload.get("ts") or []
    observed_at = None
    if timestamps:
        observed_at = str(timestamps[0])
    return {
        "source_name": "windy",
        "source_type": "forecast",
        "wind_knots": round(speed_ms * MS_TO_KNOTS, 1),
        "gust_knots": None,
        "wind_direction": round(direction),
        "observed_at": observed_at,
        "confidence": 0.70,
        "raw_payload": payload,
    }


def _parse_meteogarda_html(html: str, station: dict[str, Any]) -> dict[str, Any] | None:
    import re

    wind_box = re.search(
        r'<h4>\s*Vento\s*</h4>.*?<FONT class="cifra_p">([A-Z]{1,3})<br>([0-9]+(?:[.,][0-9]+)?)</FONT>\s*<FONT class="uni_p">kt</FONT>.*?<FONT class="cifra_max">([0-9]+(?:[.,][0-9]+)?)kt</FONT><br><FONT class="cifra_d">([0-9]+(?:[.,][0-9]+)?)kt</FONT>',
        html,
        re.I | re.S,
    )
    if not wind_box:
        return None

    def fnum(value: str) -> float:
        return float(value.replace(",", "."))

    direction_text, wind, gust, avg_10m = wind_box.groups()

    return {
        "source_name": station.get("station_id") or "meteogarda_html",
        "source_type": "anemometer",
        "wind_knots": normalize_speed_to_knots(wind, "kt"),
        "gust_knots": normalize_speed_to_knots(gust, "kt"),
        "wind_direction": normalize_direction_to_degrees(direction_text),
        "observed_at": None,
        "confidence": float(station.get("trust_score") or 0.70),
        "raw_payload": {
            "provider": "meteogarda_html",
            "url": station.get("url"),
            "direction_text": direction_text,
            "avg_10min_knots": fnum(avg_10m),
        },
    }


def _parse_weatherflow_tempest_html(html: str, station: dict[str, Any]) -> dict[str, Any] | None:
    import re

    def extract(pattern: str) -> str | None:
        match = re.search(pattern, html, re.S)
        return match.group(1).strip() if match else None

    def extract_block_value(block_class: str) -> str | None:
        pattern = (
            r"<div class=[\"']?[^\"'>]*" + re.escape(block_class) +
            r"[^\"'>]*[\"']?.*?<span class=[\"']?data[\"']?>(.*?)</span>"
        )
        match = re.search(pattern, html, re.S)
        return match.group(1).strip() if match else None

    def gust_from_text(text: str | None) -> str | None:
        if not text:
            return None
        nums = re.findall(r"[0-9]+(?:[.,][0-9]+)?", text)
        if not nums:
            return None
        return max(nums, key=lambda value: float(value.replace(",", ".")))

    direction = extract_block_value("wind-direction")
    avg = extract_block_value("wind-avg")
    gust_text = extract_block_value("wind-gust")
    obs_time = extract(r'<span id=obs-date-time>([^<]+)</span>')
    updated_time = extract(r'<span id=time-updated>([^<]+)</span>')
    device_id = extract(r'device_id":`([0-9]+)`')

    wind_knots = normalize_speed_to_knots(avg, "kt")
    if wind_knots is None:
        return None

    return {
        "source_name": station.get("station_id") or "weatherflow_tempest_html",
        "source_type": "anemometer",
        "wind_knots": wind_knots,
        "gust_knots": normalize_speed_to_knots(gust_from_text(gust_text), "kt"),
        "wind_direction": normalize_direction_to_degrees(direction, direction_semantics="from"),
        "observed_at": obs_time,
        "confidence": float(station.get("trust_score") or 0.70),
        "raw_payload": {
            "provider": "weatherflow_tempest_html",
            "url": station.get("url"),
            "device_id": device_id,
            "direction_raw": direction,
            "gust_text": gust_text,
            "updated_time_raw": updated_time,
        },
    }


async def fetch_anemometer(station: dict[str, Any], *, timeout_s: float) -> dict[str, Any] | None:
    url = str(station.get("url") or "").strip()
    if not url:
        return None

    provider = str(station.get("provider") or "").strip().lower()

    if provider == "meteogarda_html":
        try:
            async with httpx.AsyncClient(timeout=timeout_s) as client:
                response = await client.get(url)
                response.raise_for_status()
                html = response.text
        except Exception:
            return None
        return _parse_meteogarda_html(html, station)

    if provider == "weatherflow_tempest_html":
        try:
            async with httpx.AsyncClient(timeout=timeout_s) as client:
                response = await client.get(url)
                response.raise_for_status()
                html = response.text
        except Exception:
            return None
        return _parse_weatherflow_tempest_html(html, station)

    try:
        async with httpx.AsyncClient(timeout=timeout_s) as client:
            response = await client.get(url)
            response.raise_for_status()
            payload = response.json()
    except Exception:
        return None

    source = payload.get("latest") or payload.get("data") or payload.get("wind") or payload
    if not isinstance(source, dict):
        return None
    wind_knots = _number(_first(source, ["wind_knots", "wind_kt", "wind_kts", "wind", "speed_knots", "speed_kt", "avg_knots"]))
    if wind_knots is None:
        return None
    return {
        "source_name": station.get("station_id") or station.get("provider") or "anemometer",
        "source_type": "anemometer",
        "wind_knots": wind_knots,
        "gust_knots": _number(_first(source, ["gust_knots", "gust_kt", "gust_kts", "gust", "max_gust_knots"])),
        "wind_direction": _number(_first(source, ["wind_direction", "direction", "direction_deg", "wind_dir", "wind_dir_deg"])),
        "observed_at": _first(source, ["observed_at", "updated_at", "timestamp", "time", "datetime", "ts"]),
        "confidence": 0.95,
        "raw_payload": payload,
    }
