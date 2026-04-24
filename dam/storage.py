"""
Dam Storage - Storage management utilities

Provides storage-related utilities for dam operations.
"""

import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from pathlib import Path

from .config import dam_config


logger = logging.getLogger(__name__)


class DamStorage:
    """Storage utilities for dam system"""
    
    def __init__(self):
        """Initialize dam storage utilities"""
        self.log_file = dam_config.log_file
    
    def log_dam_event(self, message: str, level: str = "INFO") -> None:
        """Log dam event to system log"""
        try:
            timestamp = datetime.now(timezone.utc).isoformat()
            log_line = f"{timestamp} [dam] {message}\n"
            
            # Append to log file
            with open(self.log_file, "a", encoding="utf-8") as f:
                f.write(log_line)
                f.flush()
            
            # Also log to Python logger
            if level.upper() == "ERROR":
                logger.error(message)
            elif level.upper() == "WARNING":
                logger.warning(message)
            else:
                logger.info(message)
                
        except Exception as e:
            logger.error(f"Failed to log dam event: {e}")
    
    def validate_message_structure(self, message: Dict[str, Any]) -> bool:
        """Validate message structure for dam operations"""
        required_fields = ["message_id", "session_id", "technical_id", "event_ts", "src"]
        
        for field in required_fields:
            if field not in message:
                logger.error(f"Missing required field: {field}")
                return False
        
        # Validate message_id format
        message_id = message.get("message_id", "")
        if not isinstance(message_id, str) or len(message_id) < 1:
            logger.error("Invalid message_id format")
            return False
        
        # Validate event_ts format
        event_ts = message.get("event_ts", "")
        try:
            datetime.fromisoformat(event_ts.replace('Z', '+00:00'))
        except (ValueError, AttributeError):
            logger.error(f"Invalid event_ts format: {event_ts}")
            return False
        
        return True
    
    def prepare_message_for_storage(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare message for storage in dam"""
        # Add metadata
        prepared = message.copy()
        prepared["received_at"] = datetime.now(timezone.utc).isoformat()
        prepared["claim_count"] = 0
        prepared["dam_version"] = "1.0.0"
        
        # Validate structure
        if not self.validate_message_structure(prepared):
            raise ValueError("Invalid message structure")
        
        return prepared
    
    def extract_business_payload(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """Extract business payload from dam message"""
        business_fields = [
            "weight", "gender", "board", "boardSize", "level", 
            "kite", "wind", "brand", "model", "location", 
            "water", "result", "note", "ts"
        ]
        
        payload = {}
        for field in business_fields:
            if field in message:
                payload[field] = message[field]
        
        return payload
    
    def format_message_for_submit(self, dam_message: Dict[str, Any]) -> Dict[str, Any]:
        """Format dam message for /submit endpoint"""
        business_payload = self.extract_business_payload(dam_message)
        
        submit_payload = {
            "message_id": dam_message["message_id"],
            "session_id": dam_message["session_id"],
            "technical_id": dam_message["technical_id"],
            "event_ts": dam_message["event_ts"],
            "src": dam_message["src"],
            **business_payload
        }
        
        return submit_payload
    
    def get_storage_info(self) -> Dict[str, Any]:
        """Get storage information"""
        return {
            "log_file": str(self.log_file),
            "log_file_exists": self.log_file.exists(),
            "log_file_size": self.log_file.stat().st_size if self.log_file.exists() else 0,
            "active_engine": dam_config.active_engine,
            "retention_days": self._get_retention_days(),
        }
    
    def _get_retention_days(self) -> int:
        """Get message retention period in days"""
        if dam_config.is_sqs_active():
            return dam_config.sqs_message_retention_period // 86400
        elif dam_config.is_kafka_active():
            return 7  # Default Kafka retention
        return 1


# Global storage instance
dam_storage = DamStorage()
