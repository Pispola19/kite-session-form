"""
Dam Interface - Contract for dam engines

Abstract interface that can be implemented by SQS (active) or Kafka (ready).
Provides unified operations for enqueue, claim, ack, retry, and stats.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any
from datetime import datetime
from dataclasses import dataclass


@dataclass
class DamMessage:
    """Standard message format for dam operations"""
    message_id: str
    session_id: str
    technical_id: str
    event_ts: str
    src: str
    payload: Dict[str, Any]
    received_at: datetime
    claim_token: Optional[str] = None
    claim_count: int = 0
    last_claimed_at: Optional[datetime] = None


@dataclass
class DamStats:
    """Dam statistics for monitoring"""
    total_messages: int
    pending_messages: int
    oldest_message_age_seconds: int
    last_write_at: Optional[datetime]
    last_release_at: Optional[datetime]
    last_error: Optional[str]
    engine_type: str


class DamEngine(ABC):
    """Abstract interface for dam engines"""
    
    @abstractmethod
    async def enqueue(self, message: DamMessage) -> bool:
        """Add message to dam"""
        pass
    
    @abstractmethod
    async def claim_batch(self, max_messages: int = 10, claim_timeout_seconds: int = 30) -> List[DamMessage]:
        """Claim batch of messages for processing"""
        pass
    
    @abstractmethod
    async def ack(self, message: DamMessage) -> bool:
        """Acknowledge successful processing"""
        pass
    
    @abstractmethod
    async def retry(self, message: DamMessage) -> bool:
        """Retry failed message processing"""
        pass
    
    @abstractmethod
    async def get_stats(self) -> DamStats:
        """Get dam statistics"""
        pass
    
    @abstractmethod
    async def health_check(self) -> bool:
        """Check engine health"""
        pass


class DamInterface:
    """Main dam interface that delegates to appropriate engine"""
    
    def __init__(self, engine: DamEngine):
        self.engine = engine
    
    async def enqueue(self, message: DamMessage) -> bool:
        """Enqueue message using active engine"""
        return await self.engine.enqueue(message)
    
    async def claim_batch(self, max_messages: int = 10, claim_timeout_seconds: int = 30) -> List[DamMessage]:
        """Claim batch using active engine"""
        return await self.engine.claim_batch(max_messages, claim_timeout_seconds)
    
    async def ack(self, message: DamMessage) -> bool:
        """Acknowledge using active engine"""
        return await self.engine.ack(message)
    
    async def retry(self, message: DamMessage) -> bool:
        """Retry using active engine"""
        return await self.engine.retry(message)
    
    async def get_stats(self) -> DamStats:
        """Get stats from active engine"""
        return await self.engine.get_stats()
    
    async def health_check(self) -> bool:
        """Health check active engine"""
        return await self.engine.health_check()
    
    @property
    def engine_type(self) -> str:
        """Get current engine type"""
        return type(self.engine).__name__
