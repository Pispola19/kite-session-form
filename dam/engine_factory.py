"""
Engine Factory - Factory for creating dam engines

Supports both SQS (active) and Kafka (ready) engines.
Provides clean switching mechanism for future migration.
"""

import logging
from typing import Dict, Any, Optional

from dam.interface import DamEngine
from dam.config import dam_config
from dam.engines.sqs_engine import SQSEngine
from dam.engines.kafka_adapter import KafkaAdapter
from dam.kafka_ready import kafka_ready_interface


logger = logging.getLogger(__name__)


class DamEngineFactory:
    """Factory for creating dam engines"""
    
    @staticmethod
    def create_engine(engine_type: Optional[str] = None, config: Optional[Dict[str, Any]] = None) -> DamEngine:
        """
        Create dam engine based on type and configuration
        
        Args:
            engine_type: Engine type ("sqs", "kafka", or None for auto-detect)
            config: Engine configuration (overrides dam_config if provided)
            
        Returns:
            DamEngine instance
            
        Raises:
            ValueError: If engine type is not supported
            ImportError: If required dependencies are missing
        """
        # Auto-detect engine type if not provided
        if engine_type is None:
            engine_type = dam_config.active_engine
        
        logger.info(f"Creating dam engine: {engine_type}")
        
        if engine_type.lower() == "sqs":
            try:
                engine_config = config or dam_config.get_sqs_config()
                return SQSEngine(engine_config)
            except ImportError as e:
                logger.error(f"SQS engine not available: {e}")
                raise ImportError("boto3 is required for SQS engine") from e
        
        elif engine_type.lower() == "kafka":
            try:
                engine_config = config or dam_config.get_kafka_config()
                return KafkaAdapter(engine_config)
            except ImportError as e:
                logger.error(f"Kafka adapter not available: {e}")
                raise ImportError("Kafka dependencies not available") from e
        
        else:
            raise ValueError(f"Unsupported engine type: {engine_type}")
    
    @staticmethod
    def get_available_engines() -> Dict[str, bool]:
        """Get available engines and their status"""
        available = {
            "sqs": False,
            "kafka": False,
        }
        
        # Check SQS availability
        try:
            from .engines.sqs_engine import SQS_AVAILABLE
            available["sqs"] = SQS_AVAILABLE
        except ImportError:
            available["sqs"] = False
        
        # Check Kafka availability (always available as adapter)
        available["kafka"] = True  # KafkaAdapter is always available but inactive
        
        return available
    
    @staticmethod
    def validate_engine_config(engine_type: str, config: Dict[str, Any]) -> bool:
        """Validate engine configuration"""
        if engine_type.lower() == "sqs":
            required_fields = ["queue_url", "region", "message_group_id"]
            return all(field in config for field in required_fields)
        
        elif engine_type.lower() == "kafka":
            required_fields = ["bootstrap_servers", "topic_name", "consumer_group"]
            return all(field in config for field in required_fields)
        
        return False
    
    @staticmethod
    def get_engine_info(engine_type: str) -> Dict[str, Any]:
        """Get engine information"""
        if engine_type.lower() == "sqs":
            return {
                "type": "sqs",
                "active": dam_config.is_sqs_active(),
                "description": "AWS SQS FIFO engine (currently active)",
                "dependencies": ["boto3"],
                "features": [
                    "FIFO ordering",
                    "Exactly-once processing",
                    "Visibility timeout",
                    "Message retention",
                    "Dead letter queue support"
                ]
            }
        
        elif engine_type.lower() == "kafka":
            return {
                "type": "kafka",
                "active": dam_config.is_kafka_active(),
                "description": "Apache Kafka engine (ready but inactive)",
                "dependencies": ["confluent-kafka"],
                "features": [
                    "High throughput",
                    "Partitioning",
                    "Replication",
                    "Exactly-once semantics",
                    "Consumer groups"
                ]
            }
        
        else:
            return {
                "type": "unknown",
                "active": False,
                "description": "Unknown engine type",
                "dependencies": [],
                "features": []
            }


class DamEngineManager:
    """Manager for dam engine lifecycle"""
    
    def __init__(self):
        """Initialize engine manager"""
        self.current_engine: Optional[DamEngine] = None
        self.current_engine_type: Optional[str] = None
        self.engine_factory = DamEngineFactory()
    
    def initialize_engine(self, engine_type: Optional[str] = None, config: Optional[Dict[str, Any]] = None) -> DamEngine:
        """Initialize and return dam engine"""
        try:
            self.current_engine = self.engine_factory.create_engine(engine_type, config)
            self.current_engine_type = engine_type or dam_config.active_engine
            
            logger.info(f"Dam engine initialized: {self.current_engine_type}")
            return self.current_engine
            
        except Exception as e:
            logger.error(f"Failed to initialize dam engine: {e}")
            raise
    
    def get_current_engine(self) -> Optional[DamEngine]:
        """Get current engine"""
        return self.current_engine
    
    def get_current_engine_type(self) -> Optional[str]:
        """Get current engine type"""
        return self.current_engine_type
    
    def switch_engine(self, new_engine_type: str, config: Optional[Dict[str, Any]] = None) -> bool:
        """Switch to different engine type"""
        try:
            # Create new engine
            new_engine = self.engine_factory.create_engine(new_engine_type, config)
            
            # Switch current engine
            old_engine_type = self.current_engine_type
            self.current_engine = new_engine
            self.current_engine_type = new_engine_type
            
            logger.info(f"Switched dam engine: {old_engine_type} -> {new_engine_type}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to switch engine to {new_engine_type}: {e}")
            return False
    
    def get_engine_status(self) -> Dict[str, Any]:
        """Get current engine status"""
        if not self.current_engine:
            return {
                "initialized": False,
                "engine_type": None,
                "error": "No engine initialized"
            }
        
        try:
            import asyncio
            
            # Get stats and health
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                stats = loop.run_until_complete(self.current_engine.get_stats())
                health = loop.run_until_complete(self.current_engine.health_check())
            finally:
                loop.close()
            
            return {
                "initialized": True,
                "engine_type": self.current_engine_type,
                "engine_info": self.engine_factory.get_engine_info(self.current_engine_type),
                "stats": {
                    "pending_messages": stats.pending_messages,
                    "total_messages": stats.total_messages,
                    "oldest_message_age_seconds": stats.oldest_message_age_seconds,
                    "last_write_at": stats.last_write_at.isoformat() if stats.last_write_at else None,
                    "last_release_at": stats.last_release_at.isoformat() if stats.last_release_at else None,
                    "last_error": stats.last_error,
                },
                "healthy": health,
                "available_engines": self.engine_factory.get_available_engines(),
            }
            
        except Exception as e:
            return {
                "initialized": True,
                "engine_type": self.current_engine_type,
                "error": str(e)
            }


# Global engine manager instance
dam_engine_manager = DamEngineManager()
