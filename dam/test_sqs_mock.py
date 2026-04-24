"""
Mock SQS Engine for testing without AWS credentials

Simulates SQS behavior locally for development and testing.
"""

import json
import logging
import asyncio
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone
from collections import deque
import uuid

from dam.interface import DamEngine, DamMessage, DamStats
from dam.config import dam_config


logger = logging.getLogger(__name__)


class MockSQSEngine(DamEngine):
    """Mock SQS engine for local testing"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """Initialize mock SQS engine"""
        self.config = config or dam_config.get_sqs_config()
        self.queue_url = self.config["queue_url"]
        self.message_group_id = self.config["message_group_id"]
        self.visibility_timeout = self.config["visibility_timeout"]
        
        # In-memory queue simulation
        self._queue = deque()
        self._claimed_messages = {}  # claim_token -> message
        self._message_counter = 0
        
        # Stats tracking
        self._last_write_at: Optional[datetime] = None
        self._last_release_at: Optional[datetime] = None
        self._last_error: Optional[str] = None
        
        logger.info(f"Mock SQS engine initialized for queue: {self.queue_url}")
    
    async def enqueue(self, message: DamMessage) -> bool:
        """Enqueue message to mock SQS"""
        try:
            # Simulate SQS FIFO behavior
            mock_message = {
                "MessageId": str(uuid.uuid4()),
                "Body": json.dumps({
                    "message_id": message.message_id,
                    "session_id": message.session_id,
                    "technical_id": message.technical_id,
                    "event_ts": message.event_ts,
                    "src": message.src,
                    "payload": message.payload,
                    "received_at": message.received_at.isoformat(),
                    "claim_count": message.claim_count,
                }),
                "ReceiptHandle": str(uuid.uuid4()),
                "message": message  # Store original message for easy access
            }
            
            self._queue.append(mock_message)
            self._message_counter += 1
            self._last_write_at = datetime.now(timezone.utc)
            
            logger.info(f"Message enqueued to mock SQS: {message.message_id}")
            return True
            
        except Exception as e:
            self._last_error = str(e)
            logger.error(f"Mock SQS enqueue error for {message.message_id}: {e}")
            return False
    
    async def claim_batch(self, max_messages: int = 10, claim_timeout_seconds: int = 30) -> List[DamMessage]:
        """Claim batch of messages from mock SQS"""
        try:
            claimed_messages = []
            
            # Simulate SQS receive behavior
            for _ in range(min(max_messages, len(self._queue))):
                if not self._queue:
                    break
                
                mock_message = self._queue.popleft()
                sqs_msg = mock_message
                
                try:
                    # Parse message body
                    body = json.loads(sqs_msg["Body"])
                    
                    # Create DamMessage
                    message = DamMessage(
                        message_id=body["message_id"],
                        session_id=body["session_id"],
                        technical_id=body["technical_id"],
                        event_ts=body["event_ts"],
                        src=body["src"],
                        payload=body["payload"],
                        received_at=datetime.fromisoformat(body["received_at"]),
                        claim_token=sqs_msg["ReceiptHandle"],
                        claim_count=body.get("claim_count", 0) + 1,
                        last_claimed_at=datetime.now(timezone.utc)
                    )
                    
                    # Store claimed message for ack/retry
                    self._claimed_messages[message.claim_token] = sqs_msg
                    claimed_messages.append(message)
                    
                    logger.info(f"Message claimed from mock SQS: {message.message_id}")
                    
                except (json.JSONDecodeError, KeyError) as e:
                    logger.error(f"Failed to parse mock SQS message: {e}")
                    continue
            
            return claimed_messages
            
        except Exception as e:
            self._last_error = str(e)
            logger.error(f"Mock SQS claim batch error: {e}")
            return []
    
    async def ack(self, message: DamMessage) -> bool:
        """Acknowledge message by removing from claimed messages"""
        try:
            if not message.claim_token:
                logger.error(f"No claim token for message: {message.message_id}")
                return False
            
            # Remove from claimed messages
            if message.claim_token in self._claimed_messages:
                del self._claimed_messages[message.claim_token]
                self._last_release_at = datetime.now(timezone.utc)
                logger.info(f"Message acknowledged: {message.message_id}")
                return True
            else:
                logger.warning(f"Message not found in claimed: {message.message_id}")
                return False
                
        except Exception as e:
            self._last_error = str(e)
            logger.error(f"Mock SQS ack error for {message.message_id}: {e}")
            return False
    
    async def retry(self, message: DamMessage) -> bool:
        """Retry message by returning it to queue"""
        try:
            if message.claim_token and message.claim_token in self._claimed_messages:
                # Get original message and return to queue
                sqs_msg = self._claimed_messages[message.claim_token]
                del self._claimed_messages[message.claim_token]
                
                # Update claim count in body
                body = json.loads(sqs_msg["Body"])
                body["claim_count"] = body.get("claim_count", 0) + 1
                sqs_msg["Body"] = json.dumps(body)
                
                # Return to front of queue (FIFO)
                self._queue.appendleft(sqs_msg)
                
                logger.info(f"Message retried: {message.message_id}")
                return True
            else:
                logger.warning(f"Message not found for retry: {message.message_id}")
                return False
                
        except Exception as e:
            self._last_error = str(e)
            logger.error(f"Mock SQS retry error for {message.message_id}: {e}")
            return False
    
    async def get_stats(self) -> DamStats:
        """Get mock SQS queue statistics"""
        try:
            pending_messages = len(self._queue)
            oldest_age_seconds = 0
            
            if pending_messages > 0:
                # Calculate age of oldest message
                oldest_message = self._queue[0]
                body = json.loads(oldest_message["Body"])
                received_at = datetime.fromisoformat(body["received_at"])
                oldest_age_seconds = int((datetime.now(timezone.utc) - received_at).total_seconds())
            
            return DamStats(
                total_messages=self._message_counter,
                pending_messages=pending_messages,
                oldest_message_age_seconds=oldest_age_seconds,
                last_write_at=self._last_write_at,
                last_release_at=self._last_release_at,
                last_error=self._last_error,
                engine_type="MockSQS"
            )
            
        except Exception as e:
            self._last_error = str(e)
            logger.error(f"Mock SQS get_stats error: {e}")
            return DamStats(
                total_messages=self._message_counter,
                pending_messages=len(self._queue),
                oldest_message_age_seconds=0,
                last_write_at=self._last_write_at,
                last_release_at=self._last_release_at,
                last_error=str(e),
                engine_type="MockSQS"
            )
    
    async def health_check(self) -> bool:
        """Check mock SQS health"""
        try:
            # Simple health check - verify queue is accessible
            return True
        except Exception as e:
            self._last_error = str(e)
            logger.error(f"Mock SQS health check error: {e}")
            return False
    
    def get_queue_size(self) -> int:
        """Get current queue size for testing"""
        return len(self._queue)
    
    def get_claimed_count(self) -> int:
        """Get current claimed messages count for testing"""
        return len(self._claimed_messages)
    
    def clear_queue(self) -> None:
        """Clear queue for testing"""
        self._queue.clear()
        self._claimed_messages.clear()
        self._message_counter = 0
        logger.info("Mock SQS queue cleared")
