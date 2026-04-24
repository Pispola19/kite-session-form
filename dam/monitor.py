"""
Dam Monitor - Read-only monitoring for dam system

Exposes dam state to master monitor without interfering with operations.
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone

from .interface import DamInterface
from .config import dam_config


logger = logging.getLogger(__name__)


class DamMonitor:
    """Read-only monitor for dam system"""
    
    def __init__(self, dam_interface: DamInterface):
        """
        Initialize dam monitor.
        
        Args:
            dam_interface: Dam interface to monitor
        """
        self.dam = dam_interface
        self._last_update: Optional[datetime] = None
        self._monitor_error: Optional[str] = None
    
    async def get_status(self) -> Dict[str, Any]:
        """Get comprehensive dam status for master monitor"""
        try:
            # Get dam stats
            dam_stats = await self.dam.get_stats()
            
            # Get health status
            is_healthy = await self.dam.health_check()
            
            status = {
                "dam_status": {
                    "engine_type": dam_stats.engine_type,
                    "is_healthy": is_healthy,
                    "total_messages": dam_stats.total_messages,
                    "pending_messages": dam_stats.pending_messages,
                    "oldest_message_age_seconds": dam_stats.oldest_message_age_seconds,
                    "oldest_message_age_human": self._format_duration(dam_stats.oldest_message_age_seconds),
                    "last_write_at": dam_stats.last_write_at.isoformat() if dam_stats.last_write_at else None,
                    "last_write_human": self._format_datetime(dam_stats.last_write_at) if dam_stats.last_write_at else None,
                    "last_release_at": dam_stats.last_release_at.isoformat() if dam_stats.last_release_at else None,
                    "last_release_human": self._format_datetime(dam_stats.last_release_at) if dam_stats.last_release_at else None,
                    "last_error": dam_stats.last_error,
                },
                "monitor_status": {
                    "last_update": datetime.now(timezone.utc).isoformat(),
                    "monitor_error": self._monitor_error,
                },
                "configuration": {
                    "active_engine": dam_config.active_engine,
                    "relay_submit_url": dam_config.relay_submit_url,
                    "relay_batch_size": dam_config.relay_batch_size,
                    "relay_poll_interval": dam_config.relay_poll_interval,
                }
            }
            
            self._last_update = datetime.now(timezone.utc)
            return status
            
        except Exception as e:
            self._monitor_error = str(e)
            logger.error(f"Dam monitor error: {e}")
            
            return {
                "dam_status": {
                    "engine_type": "unknown",
                    "is_healthy": False,
                    "error": str(e),
                },
                "monitor_status": {
                    "last_update": datetime.now(timezone.utc).isoformat(),
                    "monitor_error": str(e),
                },
                "configuration": {
                    "active_engine": dam_config.active_engine,
                }
            }
    
    async def get_health_summary(self) -> Dict[str, Any]:
        """Get simple health summary for quick checks"""
        try:
            dam_stats = await self.dam.get_stats()
            is_healthy = await self.dam.health_check()
            
            return {
                "healthy": is_healthy,
                "engine": dam_stats.engine_type,
                "pending": dam_stats.pending_messages,
                "oldest_age_seconds": dam_stats.oldest_message_age_seconds,
                "last_error": dam_stats.last_error,
                "last_update": datetime.now(timezone.utc).isoformat(),
            }
            
        except Exception as e:
            return {
                "healthy": False,
                "engine": "error",
                "pending": 0,
                "oldest_age_seconds": 0,
                "last_error": str(e),
                "last_update": datetime.now(timezone.utc).isoformat(),
            }
    
    async def get_backlog_details(self) -> Dict[str, Any]:
        """Get detailed backlog information"""
        try:
            dam_stats = await self.dam.get_stats()
            
            return {
                "backlog_count": dam_stats.pending_messages,
                "oldest_message_age_seconds": dam_stats.oldest_message_age_seconds,
                "oldest_message_age_human": self._format_duration(dam_stats.oldest_message_age_seconds),
                "retention_days": self._get_retention_days(),
                "last_write_at": dam_stats.last_write_at.isoformat() if dam_stats.last_write_at else None,
                "last_write_human": self._format_datetime(dam_stats.last_write_at) if dam_stats.last_write_at else None,
            }
            
        except Exception as e:
            logger.error(f"Backlog details error: {e}")
            return {
                "backlog_count": 0,
                "error": str(e),
            }
    
    def _format_duration(self, seconds: int) -> str:
        """Format duration in human readable format"""
        if seconds < 60:
            return f"{seconds}s"
        elif seconds < 3600:
            return f"{seconds // 60}m {seconds % 60}s"
        elif seconds < 86400:
            hours = seconds // 3600
            minutes = (seconds % 3600) // 60
            return f"{hours}h {minutes}m"
        else:
            days = seconds // 86400
            hours = (seconds % 86400) // 3600
            return f"{days}d {hours}h"
    
    def _format_datetime(self, dt: datetime) -> str:
        """Format datetime in human readable format"""
        if not dt:
            return "Never"
        
        now = datetime.now(timezone.utc)
        diff = now - dt
        
        if diff.total_seconds() < 60:
            return f"{int(diff.total_seconds())}s ago"
        elif diff.total_seconds() < 3600:
            return f"{int(diff.total_seconds() // 60)}m ago"
        elif diff.total_seconds() < 86400:
            return f"{int(diff.total_seconds() // 3600)}h ago"
        else:
            return dt.strftime("%Y-%m-%d %H:%M:%S UTC")
    
    def _get_retention_days(self) -> int:
        """Get message retention period in days"""
        if dam_config.is_sqs_active():
            return dam_config.sqs_message_retention_period // 86400
        elif dam_config.is_kafka_active():
            return 7  # Default Kafka retention (would be configurable)
        return 1
