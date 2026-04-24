"""
Kafka Adapter - Kafka-ready but not active

Prepared for future Kafka migration but currently inactive.
Implements the same interface as SQS engine for seamless switching.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime
import logging

from dam.interface import DamEngine, DamMessage, DamStats


logger = logging.getLogger(__name__)


class KafkaAdapter(DamEngine):
    """
    Kafka-ready adapter implementation.
    
    Currently inactive - prepared for future migration.
    All methods will raise NotImplementedError until Kafka is activated.
    """
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize Kafka adapter with configuration.
        
        Args:
            config: Kafka configuration (bootstrap_servers, topic_name, etc.)
        """
        self.config = config
        self.topic_name = config.get("topic_name", "kite-sessions")
        self.bootstrap_servers = config.get("bootstrap_servers", [])
        self.consumer_group = config.get("consumer_group", "dam-relay")
        
        logger.info(f"Kafka adapter initialized (inactive) for topic: {self.topic_name}")
    
    async def enqueue(self, message: DamMessage) -> bool:
        """Enqueue message to Kafka (not implemented)"""
        raise NotImplementedError("Kafka adapter is not active - use SQS engine")
    
    async def claim_batch(self, max_messages: int = 10, claim_timeout_seconds: int = 30) -> List[DamMessage]:
        """Claim batch from Kafka (not implemented)"""
        raise NotImplementedError("Kafka adapter is not active - use SQS engine")
    
    async def ack(self, message: DamMessage) -> bool:
        """Acknowledge message to Kafka (not implemented)"""
        raise NotImplementedError("Kafka adapter is not active - use SQS engine")
    
    async def retry(self, message: DamMessage) -> bool:
        """Retry message to Kafka (not implemented)"""
        raise NotImplementedError("Kafka adapter is not active - use SQS engine")
    
    async def get_stats(self) -> DamStats:
        """Get Kafka stats (not implemented)"""
        raise NotImplementedError("Kafka adapter is not active - use SQS engine")
    
    async def health_check(self) -> bool:
        """Health check Kafka (not implemented)"""
        raise NotImplementedError("Kafka adapter is not active - use SQS engine")
    
    # Future implementation placeholders (commented for reference)
    
    # async def _setup_producer(self):
    #     """Setup Kafka producer when activated"""
    #     pass
    
    # async def _setup_consumer(self):
    #     """Setup Kafka consumer when activated"""
    #     pass
    
    # async def _send_to_kafka(self, message: DamMessage) -> bool:
    #     """Send message to Kafka topic"""
    #     pass
    
    # async def _receive_from_kafka(self, max_messages: int) -> List[DamMessage]:
    #     """Receive messages from Kafka topic"""
    #     pass
