from __future__ import annotations

import json
import logging
import os
import signal
import socket
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

from flask import Flask, jsonify, make_response, render_template

from config import APP_TITLE, DEBUG, HOST, PORT
from db_reader import read_dashboard_data, read_local_ingest_tail
from dam_integration import dam_integration


app = Flask(__name__)


class MasterStatusAccessFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        message = record.getMessage()
        if "/api/master-status" in message and '" 200 ' in message:
            return False
        return True


logging.getLogger("werkzeug").addFilter(MasterStatusAccessFilter())


PROJECT_DIR = Path("/Users/PER_TEST/raccolta_dati_K_test")
RUNTIME_DIR = Path(os.environ.get("KM_MASTER_RUNTIME_DIR", "/Users/PER_TEST/monitor_kite_safe/runtime"))
INGEST_PID_FILE = RUNTIME_DIR / "ingest_api.pid"
WORKER_PID_FILE = RUNTIME_DIR / "worker.pid"
BRIDGE_PID_FILE = RUNTIME_DIR / "bridge.pid"
MASTER_LOG_FILE = RUNTIME_DIR / "master_control.log"
INGEST_HOST = os.environ.get("KM_MASTER_INGEST_HOST", "127.0.0.1")
INGEST_PORT = int(os.environ.get("KM_MASTER_INGEST_PORT", "8000") or 8000)
QUEUE_FILE = PROJECT_DIR / "ingest_api" / "storage" / "submissions.jsonl"
WORKER_OUTPUT_FILE = PROJECT_DIR / "ingest_api" / "storage" / "worker_output.jsonl"
WORKER_OFFSET_FILE = PROJECT_DIR / "ingest_api" / "storage" / "worker_offset.txt"
BRIDGE_OFFSET_FILE = PROJECT_DIR / "ingest_api" / "storage" / "bridge_offset.txt"
WORKER_SCRIPT = PROJECT_DIR / "ingest_api" / "worker.py"
BRIDGE_PROJECT_DIR = Path("/Users/PER_TEST/dati_massivi_test")
BRIDGE_LOOP_SCRIPT = BRIDGE_PROJECT_DIR / "scripts" / "worker_output_bridge_loop.py"
INGEST_COMMAND = ["uvicorn", "ingest_api.main:app", "--host", INGEST_HOST, "--port", str(INGEST_PORT)]
WORKER_COMMAND = ["python3", "ingest_api/worker.py"]
BRIDGE_COMMAND = ["python3", str(BRIDGE_LOOP_SCRIPT)]
START_WAIT_SECONDS = float(os.environ.get("KM_MASTER_START_WAIT_SECONDS", "3.0") or 3.0)
STOP_WAIT_SECONDS = float(os.environ.get("KM_MASTER_STOP_WAIT_SECONDS", "5.0") or 5.0)
MASTER_PROCESSES: dict[str, subprocess.Popen] = {}


def _log_master(message: str) -> None:
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    line = f"{datetime.now(timezone.utc).isoformat()} [master] {message}\n"
    fd = os.open(str(MASTER_LOG_FILE), os.O_WRONLY | os.O_APPEND | os.O_CREAT, 0o644)
    try:
        os.write(fd, line.encode("utf-8"))
        os.fsync(fd)
    finally:
        os.close(fd)


def _pid_running(pid: int | None) -> bool:
    if pid is None:
        return False
    try:
        os.kill(int(pid), 0)
    except (ProcessLookupError, ValueError, TypeError):
        return False
    except PermissionError:
        return True
    return True


def _read_pid(path: Path) -> int | None:
    try:
        if not path.is_file():
            return None
        return int(path.read_text(encoding="utf-8").splitlines()[0].strip())
    except Exception:
        return None


def _write_pid(path: Path, pid: int) -> None:
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    fd = os.open(str(path), os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o644)
    try:
        os.write(fd, f"{int(pid)}\n{datetime.now(timezone.utc).isoformat()}\n".encode("utf-8"))
        os.fsync(fd)
    finally:
        os.close(fd)


def _clear_pid(path: Path) -> None:
    try:
        if path.is_file():
            path.unlink()
    except FileNotFoundError:
        pass


def _port_open(host: str | None = None, port: int | None = None) -> bool:
    host = host or INGEST_HOST
    port = int(port if port is not None else INGEST_PORT)
    try:
        with socket.create_connection((host, port), timeout=0.5):
            return True
    except OSError:
        return False


def _process_pids_matching(text: str) -> list[int]:
    try:
        result = subprocess.run(
            ["ps", "-axo", "pid=,command="],
            capture_output=True,
            text=True,
            check=False,
            timeout=2,
        )
    except Exception:
        return []
    if result.returncode != 0:
        return []

    pids: list[int] = []
    current_pid = os.getpid()
    for line in result.stdout.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        raw_pid, _, command = stripped.partition(" ")
        try:
            pid = int(raw_pid)
        except ValueError:
            continue
        if pid == current_pid:
            continue
        if text in command and _pid_running(pid):
            pids.append(pid)
    return pids


def _discover_worker_pid() -> int | None:
    saved_pid = _read_pid(WORKER_PID_FILE)
    if _pid_running(saved_pid):
        return saved_pid
    worker_path_matches = _process_pids_matching(str(WORKER_SCRIPT))
    if worker_path_matches:
        return worker_path_matches[0]
    worker_command_matches = _process_pids_matching("ingest_api/worker.py")
    return worker_command_matches[0] if worker_command_matches else None


def _discover_bridge_pid() -> int | None:
    saved_pid = _read_pid(BRIDGE_PID_FILE)
    if _pid_running(saved_pid):
        return saved_pid
    bridge_path_matches = _process_pids_matching(str(BRIDGE_LOOP_SCRIPT))
    if bridge_path_matches:
        return bridge_path_matches[0]
    bridge_command_matches = _process_pids_matching("worker_output_bridge_loop.py")
    return bridge_command_matches[0] if bridge_command_matches else None


def _queue_status() -> dict[str, object]:
    queue_parent = QUEUE_FILE.parent
    queue_exists = QUEUE_FILE.is_file()
    output_parent = WORKER_OUTPUT_FILE.parent
    output_exists = WORKER_OUTPUT_FILE.is_file()
    queue_accessible = queue_parent.is_dir() and os.access(queue_parent, os.R_OK | os.W_OK)
    output_accessible = output_parent.is_dir() and os.access(output_parent, os.R_OK | os.W_OK)
    state = "OK" if queue_accessible and output_accessible else "ERROR"
    return {
        "state": state,
        "queue_file": str(QUEUE_FILE),
        "queue_exists": queue_exists,
        "queue_parent_accessible": queue_accessible,
        "worker_output_file": str(WORKER_OUTPUT_FILE),
        "worker_output_exists": output_exists,
        "worker_output_parent_accessible": output_accessible,
    }


def _file_size(path: Path) -> int | None:
    try:
        if not path.is_file():
            return None
        return int(path.stat().st_size)
    except OSError:
        return None


def _read_offset(path: Path) -> int | None:
    try:
        if not path.is_file():
            return None
        return int(path.read_text(encoding="utf-8").strip() or "0")
    except Exception:
        return None


def _backlog_bytes(size: int | None, offset: int | None) -> int | None:
    if size is None or offset is None:
        return None
    return max(0, int(size) - int(offset))


def _path_state(*, input_exists: bool, consumer_alive: bool, backlog: int | None) -> str:
    if not input_exists:
        return "ERROR"
    if backlog is None:
        return "DEGRADED"
    if backlog > 0:
        return "DEGRADED" if consumer_alive else "ERROR"
    return "OK" if consumer_alive else "DEGRADED"


def _db_path_state(db_tail: dict[str, object]) -> str:
    if not db_tail.get("ok"):
        return "ERROR"
    raw = db_tail.get("last_raw_ingest_local")
    parsed = db_tail.get("last_parsed_extract_local")
    if not raw:
        return "ERROR"
    if not parsed:
        return "DEGRADED"
    try:
        return "OK" if int(parsed.get("raw_id")) >= int(raw.get("id")) else "DEGRADED"
    except Exception:
        return "DEGRADED"


def _pressure_status(*, worker_pid_alive: bool, bridge_pid_alive: bool) -> dict[str, object]:
    queue_size = _file_size(QUEUE_FILE)
    worker_offset = _read_offset(WORKER_OFFSET_FILE)
    worker_output_size = _file_size(WORKER_OUTPUT_FILE)
    bridge_offset = _read_offset(BRIDGE_OFFSET_FILE)
    worker_backlog = _backlog_bytes(queue_size, worker_offset)
    bridge_backlog = _backlog_bytes(worker_output_size, bridge_offset)
    db_tail = read_local_ingest_tail()

    return {
        "queue_size_bytes": queue_size,
        "worker_offset_bytes": worker_offset,
        "worker_backlog_bytes": worker_backlog,
        "worker_output_size_bytes": worker_output_size,
        "bridge_offset_bytes": bridge_offset,
        "bridge_backlog_bytes": bridge_backlog,
        "worker_path_state": _path_state(
            input_exists=QUEUE_FILE.is_file(),
            consumer_alive=worker_pid_alive,
            backlog=worker_backlog,
        ),
        "bridge_path_state": _path_state(
            input_exists=WORKER_OUTPUT_FILE.is_file(),
            consumer_alive=bridge_pid_alive,
            backlog=bridge_backlog,
        ),
        "db_fabbrica_ingresso_state": _db_path_state(db_tail),
        "last_raw_ingest_local": db_tail.get("last_raw_ingest_local"),
        "last_parsed_extract_local": db_tail.get("last_parsed_extract_local"),
        "db_error": db_tail.get("error"),
    }


def build_master_status() -> dict[str, object]:
    ingest_pid = _read_pid(INGEST_PID_FILE)
    ingest_pid_alive = _pid_running(ingest_pid)
    ingest_port_open = _port_open()
    worker_pid = _discover_worker_pid()
    saved_worker_pid = _read_pid(WORKER_PID_FILE)
    worker_pid_alive = _pid_running(worker_pid)
    bridge_pid = _discover_bridge_pid()
    saved_bridge_pid = _read_pid(BRIDGE_PID_FILE)
    bridge_pid_alive = _pid_running(bridge_pid)
    queue = _queue_status()
    pressure = _pressure_status(worker_pid_alive=worker_pid_alive, bridge_pid_alive=bridge_pid_alive)

    if ingest_port_open and worker_pid_alive and bridge_pid_alive and queue["state"] == "OK":
        overall = "ON"
    elif not ingest_port_open and not worker_pid_alive and not bridge_pid_alive:
        overall = "OFF"
    elif queue["state"] != "OK":
        overall = "ERROR"
    else:
        overall = "DEGRADED"

    ingest_state = "ON" if ingest_port_open else ("DEGRADED" if ingest_pid_alive else "OFF")
    worker_state = "ON" if worker_pid_alive else "OFF"
    bridge_state = "ON" if bridge_pid_alive else "OFF"
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "overall": overall,
        "ingest": {
            "state": ingest_state,
            "host": INGEST_HOST,
            "port": INGEST_PORT,
            "port_open": ingest_port_open,
            "pid_file": str(INGEST_PID_FILE),
            "pid": ingest_pid,
            "pid_alive": ingest_pid_alive,
            "managed_by_master": ingest_pid_alive and ingest_pid == _read_pid(INGEST_PID_FILE),
        },
        "worker": {
            "state": worker_state,
            "pid_file": str(WORKER_PID_FILE),
            "pid": worker_pid,
            "saved_pid": saved_worker_pid,
            "pid_alive": worker_pid_alive,
            "managed_by_master": worker_pid_alive and worker_pid == saved_worker_pid,
        },
        "bridge": {
            "state": bridge_state,
            "pid_file": str(BRIDGE_PID_FILE),
            "pid": bridge_pid,
            "saved_pid": saved_bridge_pid,
            "pid_alive": bridge_pid_alive,
            "managed_by_master": bridge_pid_alive and bridge_pid == saved_bridge_pid,
            "derived_from_worker": bool(worker_pid_alive),
            "worker_pid": worker_pid,
        },
        "queue": queue,
        "pressure": pressure,
        "dam": _get_dam_status(),
    }


def _get_dam_status() -> dict:
    """Get dam status for master monitor"""
    try:
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            dam_status = loop.run_until_complete(dam_integration.get_dam_status())
        finally:
            loop.close()
        return _with_dam_queue_counts(dam_status)
    except Exception as e:
        return {
            "available": False,
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }


def _safe_dam_error(error: object, *, queue_url: str | None = None) -> str:
    message = str(error)
    if queue_url:
        message = message.replace(queue_url, "[SQS_QUEUE_URL_REDACTED]")
    return message.splitlines()[0][:240]


def _queue_attr_int(attributes: dict[str, str], name: str) -> int:
    try:
        return int(attributes.get(name, 0) or 0)
    except (TypeError, ValueError):
        return 0


def _with_dam_queue_counts(status: dict) -> dict:
    """Attach safe SQS counters for the master card without exposing queue config."""
    if not isinstance(status, dict):
        return status

    dam_status = status.setdefault("dam_status", {})
    if not isinstance(dam_status, dict):
        return status
    if "in_flight_messages" in dam_status and "delayed_messages" in dam_status:
        return status

    queue_url = None
    try:
        monitor = getattr(dam_integration, "monitor", None)
        dam_interface = getattr(monitor, "dam", None)
        engine = getattr(dam_interface, "engine", None)
        sqs_client = getattr(engine, "sqs_client", None)
        queue_url = getattr(engine, "queue_url", None)
        if sqs_client is None or not queue_url:
            return status

        response = sqs_client.get_queue_attributes(
            QueueUrl=queue_url,
            AttributeNames=[
                "ApproximateNumberOfMessages",
                "ApproximateNumberOfMessagesNotVisible",
                "ApproximateNumberOfMessagesDelayed",
            ],
        )
        attributes = response.get("Attributes", {})
        dam_status["visible_messages"] = _queue_attr_int(attributes, "ApproximateNumberOfMessages")
        dam_status["in_flight_messages"] = _queue_attr_int(attributes, "ApproximateNumberOfMessagesNotVisible")
        dam_status["delayed_messages"] = _queue_attr_int(attributes, "ApproximateNumberOfMessagesDelayed")
        dam_status.pop("queue_counts_error", None)
    except Exception as e:
        safe_error = _safe_dam_error(e, queue_url=queue_url)
        dam_status["queue_counts_error"] = safe_error
        if not dam_status.get("last_error"):
            dam_status["last_error"] = safe_error
    return status


def _wait_until(predicate, *, timeout: float) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        if predicate():
            return True
        time.sleep(0.1)
    return bool(predicate())


def _pid_stopped_or_reaped(pid: int) -> bool:
    if not _pid_running(pid):
        return True
    try:
        waited_pid, _status = os.waitpid(pid, os.WNOHANG)
        return waited_pid == pid
    except ChildProcessError:
        return not _pid_running(pid)


def _start_process(
    command: list[str],
    *,
    pid_file: Path,
    name: str,
    cwd: Path = PROJECT_DIR,
    extra_env: dict[str, str] | None = None,
) -> subprocess.Popen:
    env = os.environ.copy()
    env["PYTHONPATH"] = "."
    if extra_env:
        env.update(extra_env)
    process = subprocess.Popen(
        command,
        cwd=str(cwd),
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        text=True,
    )
    _write_pid(pid_file, int(process.pid))
    MASTER_PROCESSES[name] = process
    _log_master(f"started {name} pid={process.pid} command={' '.join(command)}")
    return process


def _terminate_saved_pid(path: Path, *, name: str) -> dict[str, object]:
    pid = _read_pid(path)
    if pid is None:
        _clear_pid(path)
        return {"name": name, "pid": None, "stopped": False, "reason": "pid_missing"}
    if not _pid_running(pid):
        _clear_pid(path)
        return {"name": name, "pid": pid, "stopped": False, "reason": "already_dead"}

    process = MASTER_PROCESSES.pop(name, None)
    if process is not None and process.pid == pid:
        process.terminate()
        try:
            process.wait(timeout=STOP_WAIT_SECONDS)
            stopped = True
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=2.0)
            stopped = True
        _clear_pid(path)
        _log_master(f"stopped {name} pid={pid} stopped={stopped}")
        return {"name": name, "pid": pid, "stopped": stopped, "reason": "terminated"}

    os.kill(pid, signal.SIGTERM)
    stopped = _wait_until(lambda: _pid_stopped_or_reaped(pid), timeout=STOP_WAIT_SECONDS)
    if not stopped and _pid_running(pid):
        os.kill(pid, signal.SIGKILL)
        stopped = _wait_until(lambda: _pid_stopped_or_reaped(pid), timeout=2.0)

    try:
        os.waitpid(pid, os.WNOHANG)
    except ChildProcessError:
        pass
    _clear_pid(path)
    _log_master(f"stopped {name} pid={pid} stopped={stopped}")
    return {"name": name, "pid": pid, "stopped": stopped, "reason": "terminated"}


@app.get("/")
def index():
    data = read_dashboard_data()
    response = make_response(
        render_template(
            "index.html",
            app_title=APP_TITLE,
            data=data,
            data_json=json.dumps(data, ensure_ascii=False),
        )
    )
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response


@app.get("/api/master-status")
def master_status():
    return jsonify(build_master_status())


@app.post("/api/master/start")
def master_start():
    status = build_master_status()
    if status["ingest"]["port_open"] and status["worker"]["pid_alive"] and status["bridge"]["pid_alive"]:
        return jsonify({"ok": False, "reason": "already_running", "status": status}), 409

    ingest_process = None
    worker_process = None
    bridge_process = None
    try:
        if not status["ingest"]["port_open"]:
            ingest_process = _start_process(INGEST_COMMAND, pid_file=INGEST_PID_FILE, name="ingest_api")
        if not status["worker"]["pid_alive"]:
            worker_process = _start_process(WORKER_COMMAND, pid_file=WORKER_PID_FILE, name="worker")
        if not status["bridge"]["pid_alive"]:
            bridge_process = _start_process(
                BRIDGE_COMMAND,
                pid_file=BRIDGE_PID_FILE,
                name="bridge",
                cwd=BRIDGE_PROJECT_DIR,
                extra_env={"KM_MASTER_WORKER_PID_FILE": str(WORKER_PID_FILE)},
            )
        _wait_until(lambda: _port_open(), timeout=START_WAIT_SECONDS)
        if worker_process is not None:
            _wait_until(lambda: _pid_running(worker_process.pid), timeout=START_WAIT_SECONDS)
        else:
            _wait_until(lambda: bool(build_master_status()["worker"]["pid_alive"]), timeout=START_WAIT_SECONDS)
        if bridge_process is not None:
            _wait_until(lambda: _pid_running(bridge_process.pid), timeout=START_WAIT_SECONDS)
        else:
            _wait_until(lambda: bool(build_master_status()["bridge"]["pid_alive"]), timeout=START_WAIT_SECONDS)
    except Exception as exc:
        if bridge_process is not None and _pid_running(bridge_process.pid):
            _terminate_saved_pid(BRIDGE_PID_FILE, name="bridge")
        if worker_process is not None and _pid_running(worker_process.pid):
            _terminate_saved_pid(WORKER_PID_FILE, name="worker")
        if ingest_process is not None and _pid_running(ingest_process.pid):
            _terminate_saved_pid(INGEST_PID_FILE, name="ingest_api")
        _log_master(f"start_failed error={exc}")
        return jsonify({"ok": False, "reason": "start_failed", "error": str(exc), "status": build_master_status()}), 500

    return jsonify({"ok": True, "status": build_master_status()})


@app.post("/api/master/stop")
def master_stop():
    saved_ingest_pid = _read_pid(INGEST_PID_FILE)
    saved_worker_pid = _read_pid(WORKER_PID_FILE)
    saved_bridge_pid = _read_pid(BRIDGE_PID_FILE)
    if saved_bridge_pid is None:
        discovered_bridge_pid = _discover_bridge_pid()
        if discovered_bridge_pid is not None:
            _write_pid(BRIDGE_PID_FILE, discovered_bridge_pid)
            saved_bridge_pid = discovered_bridge_pid
    if saved_ingest_pid is None and saved_worker_pid is None and saved_bridge_pid is None:
        return jsonify({"ok": True, "already_stopped": True, "status": build_master_status()})

    bridge_result = _terminate_saved_pid(BRIDGE_PID_FILE, name="bridge")
    worker_result = _terminate_saved_pid(WORKER_PID_FILE, name="worker")
    ingest_result = _terminate_saved_pid(INGEST_PID_FILE, name="ingest_api")
    return jsonify(
        {
            "ok": True,
            "results": [bridge_result, worker_result, ingest_result],
            "status": build_master_status(),
        }
    )


@app.get("/quadro-master")
def quadro_master():
    response = make_response(render_template("quadro_master.html", app_title=APP_TITLE))
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response


if __name__ == "__main__":
    app.run(host=HOST, port=PORT, debug=DEBUG)
