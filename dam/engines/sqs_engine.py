"""
SQS Engine - Active dam engine implementation

SQS FIFO implementation for persistent data retention.
Provides durable storage outside the local machine with proper FIFO ordering.
"""

import json
import logging
import asyncio
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
        """Claim batch of messages from SQS"""
        try:
            # Receive messages from SQS
            response = self.sqs_client.receive_message(
                QueueUrl=self.queue_url,
                MaxNumberOfMessages=min(max_messages, 10),  # SQS limit is 10
                WaitTimeSeconds=min(claim_timeout_seconds, 20),  # SQS limit is 20
                VisibilityTimeout=self.visibility_timeout,
                AttributeNames=["All"],
                MessageAttributeNames=["All"]
            )
            
            messages = response.get("Messages", [])
            claimed_messages = []
            
            for sqs_msg in messages:
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
                    
                    claimed_messages.append(message)
                    logger.info(f"Message claimed from SQS: {message.message_id}")
                    
                except (json.JSONDecodeError, KeyError) as e:
                    logger.error(f"Failed to parse SQS message: {e}")
                    # Try to delete malformed message
                    try:
                        self.sqs_client.delete_message(
                            QueueUrl=self.queue_url,
                            ReceiptHandle=sqs_msg["ReceiptHandle"]
                        )
                    except Exception:
                        pass
                    continue
            
            return claimed_messages
            
        except (ClientError, NoCredentialsError) as e:
            self._last_error = str(e)
            logger.error(f"SQS claim batch error: {e}")
            return []
        except Exception as e:
            self._last_error = str(e)
            logger.error(f"Unexpected claim batch error: {e}")
            return []
    
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
            # Get queue attributes
            response = self.sqs_client.get_queue_attributes(
                QueueUrl=self.queue_url,
                AttributeNames=["ApproximateNumberOfMessages", "ApproximateAgeOfOldestMessage"]
            )
            
            attributes = response.get("Attributes", {})
            pending_messages = int(attributes.get("ApproximateNumberOfMessages", 0))
            oldest_age_seconds = int(attributes.get("ApproximateAgeOfOldestMessage", 0))
            
            return DamStats(
                total_messages=0,  # SQS doesn't provide total, only pending
                pending_messages=pending_messages,
                oldest_message_age_seconds=oldest_age_seconds,
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
                last_error=str(e),
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
                last_error=str(e),
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
