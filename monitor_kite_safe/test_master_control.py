from __future__ import annotations

import importlib.util
import json
import logging
import socket
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


def _load_app_module():
    spec = importlib.util.spec_from_file_location("monitor_kite_safe_app_test", ROOT / "app.py")
    mod = importlib.util.module_from_spec(spec)
    assert spec is not None
    assert spec.loader is not None
    sys.modules["monitor_kite_safe_app_test"] = mod
    spec.loader.exec_module(mod)
    return mod


def _free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


class TestMasterControl(unittest.TestCase):
    def setUp(self) -> None:
        self.mod = _load_app_module()
        self.client = self.mod.app.test_client()

    def _patch_attr(self, name: str, value) -> None:
        original = getattr(self.mod, name)
        setattr(self.mod, name, value)
        self.addCleanup(setattr, self.mod, name, original)

    def _configure_temp_runtime(self, temp_root: Path, port: int) -> None:
        runtime = temp_root / "runtime"
        project = temp_root / "project"
        storage = project / "ingest_api" / "storage"
        storage.mkdir(parents=True)
        (storage / "submissions.jsonl").write_text("", encoding="utf-8")
        (storage / "worker_output.jsonl").write_text("", encoding="utf-8")

        self._patch_attr("PROJECT_DIR", project)
        self._patch_attr("RUNTIME_DIR", runtime)
        self._patch_attr("INGEST_PID_FILE", runtime / "ingest_api.pid")
        self._patch_attr("WORKER_PID_FILE", runtime / "worker.pid")
        self._patch_attr("BRIDGE_PID_FILE", runtime / "bridge.pid")
        self._patch_attr("MASTER_LOG_FILE", runtime / "master_control.log")
        self._patch_attr("INGEST_HOST", "127.0.0.1")
        self._patch_attr("INGEST_PORT", port)
        self._patch_attr("QUEUE_FILE", storage / "submissions.jsonl")
        self._patch_attr("WORKER_OUTPUT_FILE", storage / "worker_output.jsonl")
        self._patch_attr("BRIDGE_PROJECT_DIR", project)
        self._patch_attr(
            "INGEST_COMMAND",
            [sys.executable, "-m", "http.server", str(port), "--bind", "127.0.0.1"],
        )
        self._patch_attr(
            "WORKER_COMMAND",
            [sys.executable, "-c", "import time; time.sleep(60)"],
        )
        self._patch_attr(
            "BRIDGE_COMMAND",
            [sys.executable, "-c", "import time; time.sleep(60)"],
        )
        self._patch_attr("START_WAIT_SECONDS", 4.0)
        self._patch_attr("STOP_WAIT_SECONDS", 2.0)
        self._patch_attr("_process_pids_matching", lambda text: [])

    def test_existing_monitor_route_stays_separate(self) -> None:
        def fake_dashboard_data():
            return {
                "ok": True,
                "overview": {
                    "raw_ingest": 1,
                    "clean_records_real": 2,
                    "l3_clusters_real": 3,
                    "session_records_real_current": 0,
                },
                "core_density": [],
                "wind_distribution": [],
                "kite_distribution": [],
                "l2_status": {"count": 0, "message": "ok"},
                "db_path": "/tmp/test.db",
            }

        self._patch_attr("read_dashboard_data", fake_dashboard_data)
        response = self.client.get("/")
        body = response.get_data(as_text=True)

        self.assertEqual(response.status_code, 200)
        self.assertIn("Read-only local dashboard", body)
        self.assertNotIn("START SYSTEM", body)
        self.assertNotIn("Quadro Master", body)

    def test_master_start_stop_and_double_start(self) -> None:
        with tempfile.TemporaryDirectory(prefix="km_master_", dir="/Users/PER_TEST/monitor_kite_safe") as tmp:
            port = _free_port()
            self._configure_temp_runtime(Path(tmp), port)

            try:
                start = self.client.post("/api/master/start")
                self.assertEqual(start.status_code, 200, start.get_data(as_text=True))
                start_payload = start.get_json()
                self.assertTrue(start_payload["ok"])

                status = self.client.get("/api/master-status").get_json()
                self.assertEqual(status["ingest"]["state"], "ON")
                self.assertEqual(status["worker"]["state"], "ON")
                self.assertEqual(status["bridge"]["state"], "ON")
                self.assertEqual(status["queue"]["state"], "OK")

                second_start = self.client.post("/api/master/start")
                self.assertEqual(second_start.status_code, 409)
                self.assertEqual(second_start.get_json()["reason"], "already_running")

                stop = self.client.post("/api/master/stop")
                self.assertEqual(stop.status_code, 200, stop.get_data(as_text=True))
                self.assertTrue(stop.get_json()["ok"])
                time.sleep(0.2)

                stopped = self.client.get("/api/master-status").get_json()
                self.assertFalse(stopped["ingest"]["port_open"])
                self.assertFalse(stopped["worker"]["pid_alive"])
                self.assertFalse(stopped["bridge"]["pid_alive"])
            finally:
                self.client.post("/api/master/stop")

    def test_master_page_renders_separate_controls(self) -> None:
        response = self.client.get("/quadro-master")
        body = response.get_data(as_text=True)

        self.assertEqual(response.status_code, 200)
        self.assertIn("START SYSTEM", body)
        self.assertIn("STOP SYSTEM", body)
        self.assertIn("/api/master-status", body)
        self.assertIn("Torna al monitor", body)
        self.assertNotIn("pid_file", body)
        self.assertNotIn("queue_file", body)
        self.assertNotIn("JSON.stringify", body)
        self.assertIn("POLL_MS = 9000", body)

    def test_master_status_access_filter_only_suppresses_success_polling(self) -> None:
        filter_ = self.mod.MasterStatusAccessFilter()
        ok_poll = logging.LogRecord(
            "werkzeug",
            logging.INFO,
            "test",
            1,
            '"GET /api/master-status HTTP/1.1" 200 -',
            (),
            None,
        )
        error_poll = logging.LogRecord(
            "werkzeug",
            logging.INFO,
            "test",
            1,
            '"GET /api/master-status HTTP/1.1" 500 -',
            (),
            None,
        )
        other_route = logging.LogRecord(
            "werkzeug",
            logging.INFO,
            "test",
            1,
            '"GET /quadro-master HTTP/1.1" 200 -',
            (),
            None,
        )

        self.assertFalse(filter_.filter(ok_poll))
        self.assertTrue(filter_.filter(error_poll))
        self.assertTrue(filter_.filter(other_route))


def _real_lsof_8000() -> list[str]:
    result = subprocess.run(
        ["lsof", "-nP", "-iTCP:8000", "-sTCP:LISTEN"],
        capture_output=True,
        text=True,
        check=False,
    )
    return [line for line in result.stdout.splitlines() if line.strip()]


def _real_worker_processes() -> list[str]:
    result = subprocess.run(
        ["ps", "-axo", "pid=,command="],
        capture_output=True,
        text=True,
        check=False,
    )
    markers = [
        "/Users/PER_TEST/raccolta_dati_K_test/ingest_api/worker.py",
        "ingest_api/worker.py",
    ]
    lines = []
    for line in result.stdout.splitlines():
        if any(marker in line for marker in markers) and "--real-start-stop" not in line:
            lines.append(line.strip())
    return lines


def _real_bridge_processes() -> list[str]:
    result = subprocess.run(
        ["ps", "-axo", "pid=,command="],
        capture_output=True,
        text=True,
        check=False,
    )
    markers = [
        "/Users/PER_TEST/dati_massivi_test/scripts/worker_output_bridge_loop.py",
        "worker_output_bridge_loop.py",
    ]
    lines = []
    for line in result.stdout.splitlines():
        if any(marker in line for marker in markers) and "--real-start-stop" not in line:
            lines.append(line.strip())
    return lines


def _run_real_start_stop() -> int:
    mod = _load_app_module()
    client = mod.app.test_client()

    def status() -> dict:
        return client.get("/api/master-status").get_json()

    def wait_for(predicate, *, timeout: float = 10.0) -> dict:
        deadline = time.time() + timeout
        last = status()
        while time.time() < deadline:
            last = status()
            if predicate(last):
                return last
            time.sleep(0.2)
        return last

    report = {
        "before_lsof_8000": _real_lsof_8000(),
        "before_worker_processes": _real_worker_processes(),
        "before_bridge_processes": _real_bridge_processes(),
        "before_status": status(),
        "start_http_status": None,
        "start_response": None,
        "after_start_status": None,
        "stop_http_status": None,
        "stop_response": None,
        "after_stop_status": None,
        "after_stop_lsof_8000": None,
        "after_stop_worker_processes": None,
        "after_stop_bridge_processes": None,
        "clean_after_stop": None,
    }

    if report["before_lsof_8000"] or report["before_worker_processes"] or report["before_bridge_processes"]:
        report["aborted"] = True
        report["reason"] = "system_not_clean_before_start"
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 2

    started = False
    try:
        start = client.post("/api/master/start")
        report["start_http_status"] = start.status_code
        report["start_response"] = start.get_json()
        if start.status_code != 200 or not report["start_response"].get("ok"):
            report["aborted"] = True
            report["reason"] = "start_failed"
            print(json.dumps(report, ensure_ascii=False, indent=2))
            return 3
        started = True
        report["after_start_status"] = wait_for(
            lambda s: s["ingest"]["state"] == "ON"
            and s["worker"]["state"] == "ON"
            and s["bridge"]["state"] == "ON"
            and s["queue"]["state"] == "OK"
        )
    finally:
        if started:
            stop = client.post("/api/master/stop")
            report["stop_http_status"] = stop.status_code
            report["stop_response"] = stop.get_json()
            report["after_stop_status"] = wait_for(
                lambda s: not s["ingest"]["port_open"]
                and not s["worker"]["pid_alive"]
                and not s["bridge"]["pid_alive"]
            )
            report["after_stop_lsof_8000"] = _real_lsof_8000()
            report["after_stop_worker_processes"] = _real_worker_processes()
            report["after_stop_bridge_processes"] = _real_bridge_processes()
            report["clean_after_stop"] = (
                not report["after_stop_lsof_8000"]
                and not report["after_stop_worker_processes"]
                and not report["after_stop_bridge_processes"]
            )

    print(json.dumps(report, ensure_ascii=False, indent=2))
    if not (
        report["after_start_status"]
        and report["after_start_status"]["ingest"]["state"] == "ON"
        and report["after_start_status"]["worker"]["state"] == "ON"
        and report["after_start_status"]["bridge"]["state"] == "ON"
    ):
        return 4
    if not report["clean_after_stop"]:
        return 5
    return 0


if __name__ == "__main__":
    if "--real-start-stop" in sys.argv:
        raise SystemExit(_run_real_start_stop())
    unittest.main()
