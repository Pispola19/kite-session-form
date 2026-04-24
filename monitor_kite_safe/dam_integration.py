"""
Dam Integration for Monitor Kite Safe

Integrates dam monitoring into the master control panel.
Read-only access to dam status and metrics.
"""

import sys
import os
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime, timezone

# Add dam system to path
sys.path.insert(0, str(Path(__file__).parent.parent / "raccolta_dati_K_test"))

try:
    from dam.interface import DamInterface
    from dam.engines.sqs_engine import SQSEngine  # Real SQS engine
    from dam.monitor import DamMonitor
    from dam.config import dam_config
    DAM_AVAILABLE = True
except ImportError as e:
    DAM_AVAILABLE = False
    print(f"Dam system not available: {e}")


class DamIntegration:
    """Integration layer for dam monitoring"""
    
    def __init__(self):
        """Initialize dam integration"""
        self.is_available = DAM_AVAILABLE
        self.monitor: Optional[DamMonitor] = None
        
        if self.is_available:
            try:
                # Initialize dam components with real SQS engine
                dam_engine = SQSEngine()
                dam_interface = DamInterface(dam_engine)
                self.monitor = DamMonitor(dam_interface)
                print("Dam integration initialized successfully")
            except Exception as e:
                print(f"Failed to initialize dam integration: {e}")
                self.is_available = False
    
    async def get_dam_status(self) -> Dict[str, Any]:
        """Get dam status for master monitor"""
        if not self.is_available or not self.monitor:
            return {
                "available": False,
                "error": "Dam system not available",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        
        try:
            status = await self.monitor.get_status()
            status["available"] = True
            return status
        except Exception as e:
            return {
                "available": False,
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
    
    async def get_dam_health(self) -> Dict[str, Any]:
        """Get dam health summary"""
        if not self.is_available or not self.monitor:
            return {
                "healthy": False,
                "available": False,
                "engine": "unknown",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        
        try:
            health = await self.monitor.get_health_summary()
            health["available"] = True
            return health
        except Exception as e:
            return {
                "healthy": False,
                "available": False,
                "engine": "error",
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
    
    async def get_dam_backlog(self) -> Dict[str, Any]:
        """Get dam backlog details"""
        if not self.is_available or not self.monitor:
            return {
                "available": False,
                "backlog_count": 0,
                "error": "Dam system not available"
            }
        
        try:
            backlog = await self.monitor.get_backlog_details()
            backlog["available"] = True
            return backlog
        except Exception as e:
            return {
                "available": False,
                "backlog_count": 0,
                "error": str(e)
            }
    
    def get_dam_config(self) -> Dict[str, Any]:
        """Get dam configuration"""
        if not self.is_available:
            return {
                "available": False,
                "error": "Dam system not available"
            }
        
        try:
            return {
                "available": True,
                "active_engine": dam_config.active_engine,
                "relay_submit_url": dam_config.relay_submit_url,
                "relay_batch_size": dam_config.relay_batch_size,
                "relay_poll_interval": dam_config.relay_poll_interval,
                "monitor_update_interval": dam_config.monitor_update_interval,
                "sqs_queue_url": dam_config.sqs_queue_url if dam_config.is_sqs_active() else None,
                "kafka_bootstrap_servers": dam_config.kafka_bootstrap_servers if dam_config.is_kafka_active() else None,
            }
        except Exception as e:
            return {
                "available": False,
                "error": str(e)
            }


# Global dam integration instance
dam_integration = DamIntegration()
