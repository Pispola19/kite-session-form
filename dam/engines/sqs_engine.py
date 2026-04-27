"""
SQS Engine - Active dam engine implementation

SQS FIFO implementation for persistent data retention.
Provides durable storage outside the local machine with proper FIFO ordering.
"""

import json
import logging
import asyncio
import os
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone
from dataclasses import asdict

try:
    import boto3
    from botocore.exceptions import ClientError, NoCredentialsError
    SQS_AVAILABLE = True
except ImportError:
    SQS_AVAILABLE = False
    logging.warning("boto3 not available - SQS engine will be disabled")

from dam.interface import DamEngine, DamMessage, DamStats
from dam.config import dam_config


logger = logging.getLogger(__name__)


# Envelope keys must NEVER end up inside DamMessage.payload, because
# dam/relay.py:_release_to_submit re-applies them on top via:
#     {"message_id": msg.message_id, ..., **msg.payload}
# Keeping them inside `payload` would create a duplicate-key spread.
_ENVELOPE_KEYS: frozenset = frozenset({
    "message_id",
    "session_id",
    "technical_id",
    "event_ts",
    "src",
    "received_at",
    "claim_count",
})

_REQUIRED_ENVELOPE_FIELDS: tuple = (
    "message_id",
    "session_id",
    "technical_id",
    "event_ts",
    "src",
)

_DEFAULT_UNPARSEABLE_QUARANTINE_PATH = (
    "/Users/PER_TEST/raccolta_dati_K_test/dam/quarantine/unparseable_messages.jsonl"
)


class SQSEngine(DamEngine):
    """SQS FIFO engine implementation"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Initialize SQS engine.
        
        Args:
            config: SQS configuration (overrides dam_config if provided)
        """
        if not SQS_AVAILABLE:
            raise ImportError("boto3 is required for SQS engine")
        
        self.config = config or dam_config.get_sqs_config()
        self.queue_url = self.config["queue_url"]
        self.region = self.config["region"]
        self.message_group_id = self.config["message_group_id"]
        self.visibility_timeout = self.config["visibility_timeout"]
        self.message_retention_period = self.config["message_retention_period"]
        
        # Initialize SQS client
        self.sqs_client = boto3.client("sqs", region_name=self.region)
        
        # Stats tracking
        self._last_write_at: Optional[datetime] = None
        self._last_release_at: Optional[datetime] = None
        self._last_error: Optional[str] = None

        # Append-only sink for raw bodies that cannot be turned into a DamMessage.
        # Writing here MUST succeed before delete_message is allowed; otherwise the
        # message stays in SQS and reappears after the visibility timeout. This is
        # the survival rule: no destructive delete without a local copy.
        self.unparseable_quarantine_path: Path = Path(
            os.environ.get(
                "DAM_SQS_UNPARSEABLE_QUARANTINE_PATH",
                _DEFAULT_UNPARSEABLE_QUARANTINE_PATH,
            )
        )

        logger.info(f"SQS engine initialized for queue: {self.queue_url}")
    
    async def enqueue(self, message: DamMessage) -> bool:
        """Enqueue message to SQS FIFO queue"""
        try:
            # Prepare message for SQS
            message_body = {
                "message_id": message.message_id,
                "session_id": message.session_id,
                "technical_id": message.technical_id,
                "event_ts": message.event_ts,
                "src": message.src,
                "payload": message.payload,
                "received_at": message.received_at.isoformat(),
                "claim_count": message.claim_count,
            }
            
            # Send to SQS FIFO queue
            response = self.sqs_client.send_message(
                QueueUrl=self.queue_url,
                MessageBody=json.dumps(message_body),
                MessageGroupId=self.message_group_id,
                MessageDeduplicationId=message.message_id,
            )
            
            if response.get("MessageId"):
                self._last_write_at = datetime.now(timezone.utc)
                logger.info(f"Message enqueued to SQS: {message.message_id}")
                return True
            else:
                self._last_error = "No MessageId returned from SQS"
                logger.error(f"Failed to enqueue message: {message.message_id}")
                return False
                
        except (ClientError, NoCredentialsError) as e:
            self._last_error = str(e)
            logger.error(f"SQS enqueue error for {message.message_id}: {e}")
            return False
        except Exception as e:
            self._last_error = str(e)
            logger.error(f"Unexpected enqueue error for {message.message_id}: {e}")
            return False
    
    async def claim_batch(self, max_messages: int = 10, claim_timeout_seconds: int = 30) -> List[DamMessage]:
        """Claim batch of messages from SQS.

        Supports two distinct body shapes (see _detect_message_shape):
        - 'wrapper': internal shape produced by SQSEngine.enqueue (nested payload + received_at).
        - 'flat':    public shape produced by public_dam_gateway/lambda_function.py
                     (payload fields at top-level alongside the envelope).

        Anything else is sent to the unparseable quarantine BEFORE delete_message.
        delete_message is called only if the quarantine write succeeds; otherwise
        the message remains in SQS to reappear after the visibility timeout.
        """
        try:
            response = self.sqs_client.receive_message(
                QueueUrl=self.queue_url,
                MaxNumberOfMessages=min(max_messages, 10),
                WaitTimeSeconds=min(claim_timeout_seconds, 20),
                VisibilityTimeout=self.visibility_timeout,
                AttributeNames=["All"],
                MessageAttributeNames=["All"],
            )

            messages = response.get("Messages", [])
            claimed_messages: List[DamMessage] = []

            for sqs_msg in messages:
                raw_body = sqs_msg.get("Body")
                receipt_handle = sqs_msg.get("ReceiptHandle")

                parse_error_reason: Optional[str] = None
                parsed_body: Any = None

                if raw_body is None:
                    parse_error_reason = "missing_body"
                else:
                    try:
                        parsed_body = json.loads(raw_body)
                    except (json.JSONDecodeError, TypeError) as exc:
                        parse_error_reason = f"json_decode_error:{exc}"

                if parse_error_reason is None and not isinstance(parsed_body, dict):
                    parse_error_reason = "body_not_object"

                if parse_error_reason is None:
                    try:
                        message = self._parse_sqs_body(parsed_body, receipt_handle)
                    except (ValueError, KeyError, TypeError) as exc:
                        parse_error_reason = f"shape_invalid:{exc}"
                    else:
                        claimed_messages.append(message)
                        logger.info(f"Message claimed from SQS: {message.message_id}")
                        continue

                # Unparseable / malformed body: quarantine FIRST, delete only on success.
                quarantined = self._quarantine_unparseable(raw_body, parse_error_reason or "unknown")
                if quarantined and receipt_handle:
                    try:
                        self.sqs_client.delete_message(
                            QueueUrl=self.queue_url,
                            ReceiptHandle=receipt_handle,
                        )
                        logger.warning(
                            f"Unparseable SQS message quarantined and deleted: reason={parse_error_reason}"
                        )
                    except Exception as exc:
                        logger.error(f"delete_message after quarantine failed: {exc}")
                else:
                    logger.error(
                        "Unparseable SQS message NOT deleted (quarantine write failed); "
                        f"will reappear after visibility timeout. reason={parse_error_reason}"
                    )

            return claimed_messages

        except (ClientError, NoCredentialsError) as e:
            self._last_error = str(e)
            logger.error(f"SQS claim batch error: {e}")
            return []
        except Exception as e:
            self._last_error = str(e)
            logger.error(f"Unexpected claim batch error: {e}")
            return []

    @staticmethod
    def _detect_message_shape(body: Any) -> str:
        """Classify SQS body shape.

        Returns:
            'wrapper' if body has nested `payload` (dict) + `received_at` (str)
                      and all required envelope fields are strings.
            'flat'    if body has all required envelope fields as strings and
                      does NOT include a `payload` key (Lambda public shape).
            'invalid' otherwise.
        """
        if not isinstance(body, dict):
            return "invalid"
        envelope_ok = all(isinstance(body.get(k), str) for k in _REQUIRED_ENVELOPE_FIELDS)
        if not envelope_ok:
            return "invalid"
        if "payload" in body:
            if isinstance(body.get("payload"), dict) and isinstance(body.get("received_at"), str):
                return "wrapper"
            return "invalid"
        return "flat"

    def _parse_sqs_body(self, body: Dict[str, Any], claim_token: Optional[str]) -> DamMessage:
        """Build a DamMessage from a parsed SQS body.

        Raises ValueError if the body shape is not recognized or `received_at`
        is not parseable in the wrapper case.
        """
        shape = self._detect_message_shape(body)

        if shape == "wrapper":
            try:
                received_at = datetime.fromisoformat(body["received_at"])
            except (TypeError, ValueError) as exc:
                raise ValueError(f"invalid_received_at:{exc}") from exc
            return DamMessage(
                message_id=body["message_id"],
                session_id=body["session_id"],
                technical_id=body["technical_id"],
                event_ts=body["event_ts"],
                src=body["src"],
                payload=body["payload"],
                received_at=received_at,
                claim_token=claim_token,
                claim_count=int(body.get("claim_count", 0) or 0) + 1,
                last_claimed_at=datetime.now(timezone.utc),
            )

        if shape == "flat":
            business_payload = {
                k: v for k, v in body.items() if k not in _ENVELOPE_KEYS
            }
            return DamMessage(
                message_id=body["message_id"],
                session_id=body["session_id"],
                technical_id=body["technical_id"],
                event_ts=body["event_ts"],
                src=body["src"],
                payload=business_payload,
                received_at=datetime.now(timezone.utc),
                claim_token=claim_token,
                claim_count=int(body.get("claim_count", 0) or 0) + 1,
                last_claimed_at=datetime.now(timezone.utc),
            )

        raise ValueError(f"unrecognized_shape:{shape}")

    def _quarantine_unparseable(self, raw_body: Any, reason: str) -> bool:
        """Append an unparseable SQS body to the quarantine JSONL.

        Returns True iff the line was successfully written and fsync'd. The
        caller MUST NOT delete the SQS message unless this returns True.
        """
        try:
            self.unparseable_quarantine_path.parent.mkdir(parents=True, exist_ok=True)

            extracted_message_id: Optional[str] = None
            if isinstance(raw_body, str):
                try:
                    candidate_obj = json.loads(raw_body)
                except Exception:
                    candidate_obj = None
                if isinstance(candidate_obj, dict):
                    candidate_id = candidate_obj.get("message_id")
                    if isinstance(candidate_id, str) and candidate_id:
                        extracted_message_id = candidate_id

            record = {
                "quarantined_at": datetime.now(timezone.utc).isoformat(),
                "reason": str(reason)[:500],
                "raw_body": raw_body,
                "message_id": extracted_message_id,
            }
            line = json.dumps(record, ensure_ascii=False) + "\n"
            with open(self.unparseable_quarantine_path, "a", encoding="utf-8") as f:
                f.write(line)
                f.flush()
                try:
                    os.fsync(f.fileno())
                except OSError:
                    pass
            return True
        except Exception as exc:
            self._last_error = f"unparseable_quarantine_write_failed:{exc}"
            logger.error(f"Unparseable quarantine write failed: {exc}")
            return False
    
    async def ack(self, message: DamMessage) -> bool:
        """Acknowledge message by deleting from SQS"""
        try:
            if not message.claim_token:
                logger.error(f"No claim token for message: {message.message_id}")
                return False
            
            self.sqs_client.delete_message(
                QueueUrl=self.queue_url,
                ReceiptHandle=message.claim_token
            )
            
            self._last_release_at = datetime.now(timezone.utc)
            logger.info(f"Message acknowledged: {message.message_id}")
            return True
            
        except (ClientError, NoCredentialsError) as e:
            self._last_error = str(e)
            logger.error(f"SQS ack error for {message.message_id}: {e}")
            return False
        except Exception as e:
            self._last_error = str(e)
            logger.error(f"Unexpected ack error for {message.message_id}: {e}")
            return False
    
    async def retry(self, message: DamMessage) -> bool:
        """Retry message by returning it to queue"""
        try:
            # For SQS, we just don't ack the message and it will reappear
            # after visibility timeout expires
            # Optionally we could change visibility timeout to make it reappear sooner
            
            if message.claim_token:
                # Change visibility timeout to make it immediately available
                self.sqs_client.change_message_visibility(
                    QueueUrl=self.queue_url,
                    ReceiptHandle=message.claim_token,
                    VisibilityTimeout=0
                )
            
            logger.info(f"Message retried: {message.message_id}")
            return True
            
        except (ClientError, NoCredentialsError) as e:
            self._last_error = str(e)
            logger.error(f"SQS retry error for {message.message_id}: {e}")
            return False
        except Exception as e:
            self._last_error = str(e)
            logger.error(f"Unexpected retry error for {message.message_id}: {e}")
            return False
    
    async def get_stats(self) -> DamStats:
        """Get SQS queue statistics"""
        try:
            response = self.sqs_client.get_queue_attributes(
                QueueUrl=self.queue_url,
                AttributeNames=[
                    "ApproximateNumberOfMessages",
                    "ApproximateNumberOfMessagesNotVisible",
                    "ApproximateNumberOfMessagesDelayed"
                ]
            )

            attributes = response.get("Attributes", {})
            visible = int(attributes.get("ApproximateNumberOfMessages", 0))
            not_visible = int(attributes.get("ApproximateNumberOfMessagesNotVisible", 0))
            delayed = int(attributes.get("ApproximateNumberOfMessagesDelayed", 0))

            self._last_error = None

            return DamStats(
                total_messages=visible + not_visible + delayed,
                pending_messages=visible,
                oldest_message_age_seconds=0,
                last_write_at=self._last_write_at,
                last_release_at=self._last_release_at,
                last_error=self._last_error,
                engine_type="SQS"
            )
        except (ClientError, NoCredentialsError) as e:
            self._last_error = str(e)
            logger.error(f"SQS get_stats error: {e}")
            return DamStats(
                total_messages=0,
                pending_messages=0,
                oldest_message_age_seconds=0,
                last_write_at=self._last_write_at,
                last_release_at=self._last_release_at,
                last_error=self._last_error,
                engine_type="SQS"
            )
        except Exception as e:
            self._last_error = str(e)
            logger.error(f"Unexpected get_stats error: {e}")
            return DamStats(
                total_messages=0,
                pending_messages=0,
                oldest_message_age_seconds=0,
                last_write_at=self._last_write_at,
                last_release_at=self._last_release_at,
                last_error=self._last_error,
                engine_type="SQS"
            )

    async def health_check(self) -> bool:
        """Check SQS health"""
        try:
            response = self.sqs_client.get_queue_attributes(
                QueueUrl=self.queue_url,
                AttributeNames=["QueueArn"]
            )
            return "QueueArn" in response.get("Attributes", {})
        except Exception as e:
            self._last_error = str(e)
            logger.error(f"SQS health check error: {e}")
            return False
