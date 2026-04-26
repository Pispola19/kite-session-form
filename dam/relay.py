"""
Dam Relay - Disciplined relay to /submit

Reads from dam and releases to POST /submit with proper retry logic.
Only talks to /submit and monitor read-only.
"""

import json
import logging
import asyncio
import time
import os
from pathlib import Path
from typing import Dict, Any, Optional, Tuple
from datetime import datetime, timezone

from .interface import DamMessage, DamInterface
from .config import dam_config

# Conditional import for aiohttp
try:
    import aiohttp

    AIOHTTP_AVAILABLE = True
except ImportError:
    AIOHTTP_AVAILABLE = False


logger = logging.getLogger(__name__)


class DamRelay:
    """Relay that moves messages from dam to /submit endpoint"""

    def __init__(self, dam_interface: DamInterface, config: Optional[Dict[str, Any]] = None):
        self.dam = dam_interface
        self.config = config or dam_config.get_relay_config()

        self.submit_url = self.config["submit_url"]
        self.batch_size = int(self.config["batch_size"])
        self.poll_interval = float(self.config["poll_interval"])
        self.max_retries = int(self.config["max_retries"])
        self.retry_delay = float(self.config["retry_delay"])

        # Valve configuration
        self.max_per_minute = int(self.config.get("max_per_minute", 60))
        self.token_bucket_capacity = max(1.0, float(self.config.get("token_bucket_capacity", 10)))
        self.backlog_warning = int(self.config.get("backlog_warning", 200))
        self.backlog_critical = int(self.config.get("backlog_critical", 800))
        self.rate_normal = int(self.config.get("rate_normal", 60))
        self.rate_warning = int(self.config.get("rate_warning", 30))
        self.rate_critical = int(self.config.get("rate_critical", 10))
        self.circuit_failures = int(self.config.get("circuit_failures", 5))
        self.circuit_sleep = float(self.config.get("circuit_sleep", 60))
        self.retry_visibility_1 = int(self.config.get("retry_visibility_1", 60))
        self.retry_visibility_2 = int(self.config.get("retry_visibility_2", 120))
        self.retry_visibility_max = int(self.config.get("retry_visibility_max", 300))
        self.worker_guard_enabled = bool(self.config.get("worker_guard_enabled", False))
        self.state_file = Path(str(self.config.get("state_file", "/Users/PER_TEST/monitor_kite_safe/runtime/relay_state.json")))
        self.quarantine_path = Path(
            str(
                self.config.get(
                    "quarantine_path",
                    "/Users/PER_TEST/raccolta_dati_K_test/dam/quarantine/poison_messages.jsonl",
                )
            )
        )

        # Runtime state
        self.is_running = False
        self._last_release_at: Optional[datetime] = None
        self._last_error: Optional[str] = None
        self._processed_count = 0
        self._error_count = 0
        self._consecutive_failures = 0
        self._circuit_open_until: Optional[float] = None
        self._last_rate_limit_log_at = 0.0

        # Token bucket
        self._backlog_mode = "unknown"
        self._backlog_visible = 0
        self._backlog_in_flight = 0
        self._backlog_delayed = 0
        self._current_rate_per_minute = max(1, min(self.max_per_minute, self.rate_normal))
        self._tokens = min(1.0, self.token_bucket_capacity)
        self._last_token_refill = time.monotonic()

        logger.info(f"Dam relay initialized for {self.submit_url}")

    def _log_event(self, event: str, **fields: Any) -> None:
        parts = [event] + [f"{k}={fields[k]}" for k in sorted(fields.keys())]
        logger.info(" ".join(parts))

    def _write_state_file(self) -> None:
        try:
            self.state_file.parent.mkdir(parents=True, exist_ok=True)
            payload = {
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "relay_running": self.is_running,
                "mode": self._effective_mode(),
                "backlog_visible": self._backlog_visible,
                "backlog_in_flight": self._backlog_in_flight,
                "backlog_delayed": self._backlog_delayed,
                "rate_per_minute": self._current_rate_per_minute,
                "tokens_remaining": round(self._tokens, 3),
                "circuit_open": self._is_circuit_open(),
                "failure_count": self._consecutive_failures,
                "last_error": self._last_error,
                "processed_count": self._processed_count,
                "error_count": self._error_count,
                "last_release_at": self._last_release_at.isoformat() if self._last_release_at else None,
            }
            self.state_file.write_text(json.dumps(payload, ensure_ascii=False) + "\n", encoding="utf-8")
        except Exception:
            # State file is best-effort only.
            pass

    def _is_circuit_open(self) -> bool:
        if self._circuit_open_until is None:
            return False
        return time.monotonic() < self._circuit_open_until

    def _effective_mode(self) -> str:
        if self._is_circuit_open():
            return "circuit-open"
        return self._backlog_mode

    def _open_circuit(self) -> None:
        self._circuit_open_until = time.monotonic() + self.circuit_sleep
        self._log_event(
            "relay_circuit_open",
            failures=self._consecutive_failures,
            sleep_s=int(self.circuit_sleep),
        )
        self._write_state_file()

    def _close_circuit_if_needed(self) -> None:
        if self._circuit_open_until is None:
            return
        if time.monotonic() >= self._circuit_open_until:
            self._circuit_open_until = None
            self._consecutive_failures = 0
            self._log_event("relay_circuit_close")
            self._write_state_file()

    async def _fetch_queue_counts(self) -> Dict[str, int]:
        visible = 0
        in_flight = 0
        delayed = 0
        try:
            engine = getattr(self.dam, "engine", None)
            sqs_client = getattr(engine, "sqs_client", None)
            queue_url = getattr(engine, "queue_url", None)
            if sqs_client is not None and queue_url:
                resp = sqs_client.get_queue_attributes(
                    QueueUrl=queue_url,
                    AttributeNames=[
                        "ApproximateNumberOfMessages",
                        "ApproximateNumberOfMessagesNotVisible",
                        "ApproximateNumberOfMessagesDelayed",
                    ],
                )
                attrs = resp.get("Attributes", {})
                visible = int(attrs.get("ApproximateNumberOfMessages", 0) or 0)
                in_flight = int(attrs.get("ApproximateNumberOfMessagesNotVisible", 0) or 0)
                delayed = int(attrs.get("ApproximateNumberOfMessagesDelayed", 0) or 0)
                return {"visible": visible, "in_flight": in_flight, "delayed": delayed}
        except Exception:
            # Fall back to generic stats below.
            pass

        stats = await self.dam.get_stats()
        return {
            "visible": int(stats.pending_messages or 0),
            "in_flight": 0,
            "delayed": max(0, int((stats.total_messages or 0) - (stats.pending_messages or 0))),
        }

    def _mode_from_visible(self, visible: int) -> str:
        if visible > self.backlog_critical:
            return "critical"
        if visible > self.backlog_warning:
            return "warning"
        return "normal"

    def _rate_for_mode(self, mode: str) -> int:
        if mode == "critical":
            return max(1, min(self.max_per_minute, self.rate_critical))
        if mode == "warning":
            return max(1, min(self.max_per_minute, self.rate_warning))
        return max(1, min(self.max_per_minute, self.rate_normal))

    async def _refresh_backlog_mode(self) -> None:
        counts = await self._fetch_queue_counts()
        self._backlog_visible = counts["visible"]
        self._backlog_in_flight = counts["in_flight"]
        self._backlog_delayed = counts["delayed"]

        mode = self._mode_from_visible(self._backlog_visible)
        rate = self._rate_for_mode(mode)
        mode_changed = mode != self._backlog_mode or rate != self._current_rate_per_minute
        self._backlog_mode = mode
        self._current_rate_per_minute = rate
        if mode_changed:
            self._log_event(
                "relay_backlog_mode",
                mode=self._backlog_mode,
                relay_backlog_visible=self._backlog_visible,
                relay_backlog_in_flight=self._backlog_in_flight,
                relay_backlog_delayed=self._backlog_delayed,
                rate_per_minute=self._current_rate_per_minute,
            )
            self._write_state_file()

    def _refill_tokens(self) -> None:
        now = time.monotonic()
        elapsed = max(0.0, now - self._last_token_refill)
        self._last_token_refill = now
        refill_per_second = self._current_rate_per_minute / 60.0
        self._tokens = min(self.token_bucket_capacity, self._tokens + elapsed * refill_per_second)

    def _consume_token(self) -> None:
        self._tokens = max(0.0, self._tokens - 1.0)
        self._log_event("relay_tokens_remaining", tokens=round(self._tokens, 3))

    def _rate_wait_seconds(self) -> float:
        refill_per_second = self._current_rate_per_minute / 60.0
        if refill_per_second <= 0:
            return max(1.0, self.poll_interval)
        missing = max(0.0, 1.0 - self._tokens)
        return max(0.1, missing / refill_per_second)

    def _worker_guard_allows(self) -> bool:
        # Future-safe hook for master pressure signals; intentionally inactive unless wired.
        if not self.worker_guard_enabled:
            return True
        self._log_event("relay_worker_guard", status="predisposed_not_active")
        return True

    @staticmethod
    def _is_terminal_forbidden_reject(reason: str) -> bool:
        normalized = str(reason or "").strip().lower()
        return "forbidden_test_payload" in normalized

    def _append_quarantine_record(self, message: DamMessage, reason: str) -> bool:
        try:
            self.quarantine_path.parent.mkdir(parents=True, exist_ok=True)
            record = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "message_id": message.message_id,
                "session_id": message.session_id,
                "reason": reason,
                "relay_attempts": message.claim_count,
                "claim_count": message.claim_count,
                "payload": {
                    "message_id": message.message_id,
                    "session_id": message.session_id,
                    "technical_id": message.technical_id,
                    "event_ts": message.event_ts,
                    "src": message.src,
                    "received_at": message.received_at.isoformat(),
                    "last_claimed_at": message.last_claimed_at.isoformat() if message.last_claimed_at else None,
                    "claim_count": message.claim_count,
                    "business_payload": message.payload,
                },
            }

            line = json.dumps(record, ensure_ascii=False) + "\n"
            with open(self.quarantine_path, "a", encoding="utf-8") as f:
                f.write(line)
                f.flush()
                os.fsync(f.fileno())
            return True
        except Exception as e:
            self._last_error = f"quarantine_write_failed:{e}"
            logger.error(f"Quarantine write failed for {message.message_id}: {e}")
            return False

    async def start(self) -> None:
        if self.is_running:
            logger.warning("Relay is already running")
            return

        self.is_running = True
        self._log_event("relay_started")
        self._write_state_file()

        try:
            while self.is_running:
                self._close_circuit_if_needed()
                if self._is_circuit_open():
                    await asyncio.sleep(min(self.poll_interval, 1.0))
                    continue

                await self._refresh_backlog_mode()
                self._refill_tokens()

                if not self._worker_guard_allows():
                    await asyncio.sleep(self.poll_interval)
                    continue

                if self._tokens < 1.0:
                    now = time.monotonic()
                    if now - self._last_rate_limit_log_at >= 5.0:
                        self._last_rate_limit_log_at = now
                        self._log_event(
                            "relay_rate_limited",
                            mode=self._backlog_mode,
                            rate_per_minute=self._current_rate_per_minute,
                            tokens=round(self._tokens, 3),
                        )
                    await asyncio.sleep(self._rate_wait_seconds())
                    continue

                await self._process_batch()
                await asyncio.sleep(self.poll_interval)
        except Exception as e:
            self._last_error = str(e)
            logger.error(f"Relay process error: {e}")
        finally:
            self.is_running = False
            self._log_event("relay_stopped")
            self._write_state_file()

    async def stop(self) -> None:
        self.is_running = False
        logger.info("Dam relay stop requested")

    async def _process_batch(self) -> None:
        try:
            max_claim = min(self.batch_size, max(1, int(self._tokens)))
            if max_claim < 1:
                return
            claim_timeout = int(max(1, min(self.poll_interval, 20)))
            messages = await self.dam.claim_batch(
                max_messages=max_claim,
                claim_timeout_seconds=claim_timeout,
            )
            if not messages:
                return

            logger.info(f"Claimed {len(messages)} messages from dam")

            for message in messages:
                if self._tokens < 1.0:
                    break
                self._consume_token()
                success, reason = await self._release_to_submit(message)

                if success:
                    self._consecutive_failures = 0
                    ack_success = await self.dam.ack(message)
                    if ack_success:
                        self._processed_count += 1
                        self._last_release_at = datetime.now(timezone.utc)
                        self._log_event("relay_message_acknowledged", message_id=message.message_id)
                    else:
                        self._error_count += 1
                        self._last_error = f"ack_failed:{message.message_id}"
                        logger.error(f"Failed to acknowledge message: {message.message_id}")
                else:
                    self._error_count += 1
                    if self._is_terminal_forbidden_reject(reason):
                        quarantined = self._append_quarantine_record(message, reason)
                        if quarantined:
                            self._log_event(
                                "relay_message_quarantined",
                                message_id=message.message_id,
                                reason=reason,
                                quarantine_path=str(self.quarantine_path),
                            )
                            ack_success = await self.dam.ack(message)
                            if ack_success:
                                self._log_event(
                                    "relay_message_acknowledged",
                                    message_id=message.message_id,
                                    ack_reason="quarantine",
                                )
                                self._consecutive_failures = 0
                            else:
                                self._last_error = f"ack_failed_after_quarantine:{message.message_id}"
                                logger.error(f"Failed to acknowledge quarantined message: {message.message_id}")
                        else:
                            # Never ack if quarantine persistence failed.
                            delay = self.retry_visibility_max
                            retry_success = await self._retry_with_delay(message, delay)
                            if retry_success:
                                self._log_event(
                                    "relay_retry_delayed",
                                    message_id=message.message_id,
                                    delay=delay,
                                )
                            else:
                                logger.error(f"Failed to retry message after quarantine failure: {message.message_id}")

                        self._log_event(
                            "relay_message_rejected",
                            message_id=message.message_id,
                            reason=reason,
                        )
                    else:
                        self._consecutive_failures += 1
                        self._log_event(
                            "relay_failure_count",
                            count=self._consecutive_failures,
                            message_id=message.message_id,
                        )
                        delay = self._retry_delay_for_claim_count(message.claim_count)
                        retry_success = await self._retry_with_delay(message, delay)
                        if retry_success:
                            self._log_event(
                                "relay_retry_delayed",
                                message_id=message.message_id,
                                delay=delay,
                            )
                        else:
                            logger.error(f"Failed to retry message: {message.message_id}")

                        self._log_event(
                            "relay_message_rejected",
                            message_id=message.message_id,
                            reason=reason,
                        )
                        if self._consecutive_failures >= self.circuit_failures and not self._is_circuit_open():
                            self._open_circuit()

                self._write_state_file()
        except Exception as e:
            self._last_error = str(e)
            logger.error(f"Batch processing error: {e}")
            self._error_count += 1
            self._write_state_file()

    def _retry_delay_for_claim_count(self, claim_count: int) -> int:
        if claim_count <= 1:
            return self.retry_visibility_1
        if claim_count == 2:
            return self.retry_visibility_2
        return self.retry_visibility_max

    async def _retry_with_delay(self, message: DamMessage, delay_seconds: int) -> bool:
        try:
            engine = getattr(self.dam, "engine", None)
            sqs_client = getattr(engine, "sqs_client", None)
            queue_url = getattr(engine, "queue_url", None)
            if sqs_client is not None and queue_url and message.claim_token:
                sqs_client.change_message_visibility(
                    QueueUrl=queue_url,
                    ReceiptHandle=message.claim_token,
                    VisibilityTimeout=max(0, int(delay_seconds)),
                )
                return True
        except Exception as e:
            self._last_error = str(e)
            logger.warning(f"retry_with_delay fallback for {message.message_id}: {e}")

        return await self.dam.retry(message)

    async def _release_to_submit(self, message: DamMessage) -> Tuple[bool, str]:
        if not AIOHTTP_AVAILABLE:
            self._last_error = "aiohttp not available"
            logger.error("aiohttp not available - cannot submit to /submit")
            return False, "aiohttp_not_available"

        payload = {
            "message_id": message.message_id,
            "session_id": message.session_id,
            "technical_id": message.technical_id,
            "event_ts": message.event_ts,
            "src": message.src,
            **message.payload,
        }

        for attempt in range(self.max_retries + 1):
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(
                        self.submit_url,
                        json=payload,
                        headers={"Content-Type": "application/json"},
                        timeout=aiohttp.ClientTimeout(total=30),
                    ) as response:
                        if response.status == 200:
                            response_data = await response.json()
                            if response_data.get("ok") and response_data.get("durable"):
                                self._log_event("relay_message_submitted", message_id=message.message_id)
                                return True, "submitted"
                            reason = str(response_data.get("reason", "unknown_reject"))
                            self._last_error = f"submit_rejected:{reason}"
                        else:
                            self._last_error = f"submit_http_{response.status}"

                if attempt < self.max_retries:
                    await asyncio.sleep(self.retry_delay * (2 ** attempt))
            except asyncio.TimeoutError:
                self._last_error = "submit_timeout"
                if attempt < self.max_retries:
                    await asyncio.sleep(self.retry_delay * (2 ** attempt))
            except Exception as e:
                self._last_error = str(e)
                if attempt < self.max_retries:
                    await asyncio.sleep(self.retry_delay * (2 ** attempt))

        logger.error(f"Submit failed after all retries for {message.message_id}")
        return False, self._last_error or "submit_failed"

    async def get_stats(self) -> Dict[str, Any]:
        dam_stats = await self.dam.get_stats()

        return {
            "relay": {
                "is_running": self.is_running,
                "processed_count": self._processed_count,
                "error_count": self._error_count,
                "last_release_at": self._last_release_at.isoformat() if self._last_release_at else None,
                "last_error": self._last_error,
                "submit_url": self.submit_url,
                "batch_size": self.batch_size,
                "poll_interval": self.poll_interval,
                "max_per_minute": self.max_per_minute,
                "mode": self._effective_mode(),
                "backlog_visible": self._backlog_visible,
                "backlog_in_flight": self._backlog_in_flight,
                "backlog_delayed": self._backlog_delayed,
                "tokens_remaining": round(self._tokens, 3),
                "rate_per_minute": self._current_rate_per_minute,
                "circuit_open": self._is_circuit_open(),
                "failure_count": self._consecutive_failures,
            },
            "dam": {
                "engine_type": dam_stats.engine_type,
                "pending_messages": dam_stats.pending_messages,
                "oldest_message_age_seconds": dam_stats.oldest_message_age_seconds,
                "last_write_at": dam_stats.last_write_at.isoformat() if dam_stats.last_write_at else None,
                "last_release_at": dam_stats.last_release_at.isoformat() if dam_stats.last_release_at else None,
                "last_error": dam_stats.last_error,
            },
        }

    async def health_check(self) -> bool:
        if not AIOHTTP_AVAILABLE:
            self._last_error = "aiohttp not available"
            return False

        try:
            dam_healthy = await self.dam.health_check()
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    self.submit_url.replace("/submit", "/health"),
                    timeout=aiohttp.ClientTimeout(total=5),
                ) as response:
                    submit_healthy = response.status == 200
            return dam_healthy and submit_healthy
        except Exception as e:
            self._last_error = str(e)
            logger.error(f"Health check error: {e}")
            return False
