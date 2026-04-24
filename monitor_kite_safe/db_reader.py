from __future__ import annotations

import json
import sqlite3
from typing import Any

from config import DB_PATH, DB_URI


def _connect_ro() -> sqlite3.Connection:
    try:
        con = sqlite3.connect(DB_URI, uri=True)
        con.row_factory = sqlite3.Row
        con.execute("SELECT name FROM sqlite_master LIMIT 1").fetchone()
        return con
    except Exception:
        try:
            con.close()
        except Exception:
            pass

    con = sqlite3.connect(f"file:{DB_PATH}?immutable=1", uri=True)
    con.row_factory = sqlite3.Row
    return con


def _scalar(con: sqlite3.Connection, query: str) -> int:
    row = con.execute(query).fetchone()
    if not row:
        return 0
    value = row[0]
    return int(value) if value is not None else 0


def _rows(con: sqlite3.Connection, query: str) -> list[sqlite3.Row]:
    return con.execute(query).fetchall()


def _row_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
    if not row:
        return None
    return {key: row[key] for key in row.keys()}


def _session_id_from_raw_text(raw_text: str | None) -> str | None:
    if not raw_text:
        return None
    try:
        payload = json.loads(raw_text)
    except Exception:
        return None
    if not isinstance(payload, dict):
        return None
    value = payload.get("session_id") or payload.get("technical_id")
    return str(value) if value not in (None, "") else None


def read_local_ingest_tail() -> dict[str, Any]:
    if not DB_PATH.is_file():
        return {
            "ok": False,
            "error": f"Database not found: {DB_PATH}",
        }

    try:
        con = _connect_ro()
    except Exception as exc:
        return {
            "ok": False,
            "error": str(exc),
        }

    try:
        raw = _row_dict(
            con.execute(
                """
                SELECT id, source, source_url, created_at, raw_text
                FROM raw_ingest
                WHERE source = 'user_submission' OR source_url = 'local_worker'
                ORDER BY id DESC
                LIMIT 1
                """
            ).fetchone()
        )
        parsed = _row_dict(
            con.execute(
                """
                SELECT p.id, p.raw_id, p.parser_version, p.created_at, r.raw_text
                FROM parsed_extract p
                JOIN raw_ingest r ON r.id = p.raw_id
                WHERE r.source = 'user_submission' OR r.source_url = 'local_worker'
                ORDER BY p.id DESC
                LIMIT 1
                """
            ).fetchone()
        )

        if raw is not None:
            raw["session_id"] = _session_id_from_raw_text(raw.pop("raw_text", None))
        if parsed is not None:
            parsed["session_id"] = _session_id_from_raw_text(parsed.pop("raw_text", None))

        return {
            "ok": True,
            "last_raw_ingest_local": raw,
            "last_parsed_extract_local": parsed,
        }
    finally:
        con.close()


def read_dashboard_data() -> dict[str, Any]:
    if not DB_PATH.is_file():
        return {
            "ok": False,
            "error": f"Database not found: {DB_PATH}",
        }

    try:
        con = _connect_ro()
    except Exception as exc:
        return {
            "ok": False,
            "error": str(exc),
        }

    try:
        overview = {
            "raw_ingest": _scalar(con, "SELECT COUNT(*) FROM raw_ingest"),
            "clean_records_real": _scalar(con, "SELECT COUNT(*) FROM clean_records_real"),
            "l3_clusters_real": _scalar(con, "SELECT COUNT(*) FROM l3_correlation_clusters_real"),
            "session_records_real_current": _scalar(con, "SELECT COUNT(*) FROM session_records_real_current"),
        }

        core_density_rows = _rows(
            con,
            """
            SELECT wind_knots, kite_size_m2, rider_weight_kg, COUNT(*) as cnt
            FROM clean_records_real_current
            GROUP BY 1,2,3
            ORDER BY cnt DESC
            LIMIT 20
            """,
        )
        core_density = [
            {
                "wind_knots": row["wind_knots"],
                "kite_size_m2": row["kite_size_m2"],
                "rider_weight_kg": row["rider_weight_kg"],
                "cnt": int(row["cnt"] or 0),
            }
            for row in core_density_rows
        ]

        wind_rows = _rows(
            con,
            """
            SELECT wind_knots, COUNT(*) AS cnt
            FROM clean_records_real_current
            GROUP BY 1
            ORDER BY wind_knots
            """,
        )
        wind_distribution = [
            {
                "label": "NULL" if row["wind_knots"] is None else str(row["wind_knots"]),
                "value": int(row["cnt"] or 0),
            }
            for row in wind_rows
        ]

        kite_rows = _rows(
            con,
            """
            SELECT kite_size_m2, COUNT(*) AS cnt
            FROM clean_records_real_current
            GROUP BY 1
            ORDER BY kite_size_m2
            """,
        )
        kite_distribution = [
            {
                "label": "NULL" if row["kite_size_m2"] is None else str(row["kite_size_m2"]),
                "value": int(row["cnt"] or 0),
            }
            for row in kite_rows
        ]

        session_current = overview["session_records_real_current"]
        l2_status = {
            "count": session_current,
            "message": "L2 vuoto → mancanza densità dati (CORRETTO)" if session_current == 0 else "L2 presente",
        }

        return {
            "ok": True,
            "db_path": str(DB_PATH),
            "overview": overview,
            "core_density": core_density,
            "wind_distribution": wind_distribution,
            "kite_distribution": kite_distribution,
            "l2_status": l2_status,
        }
    finally:
        con.close()
