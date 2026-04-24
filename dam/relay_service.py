"""
Dam Relay Service - Background service for dam to /submit relay

Runs continuously in background, claiming messages from dam
and releasing them to /submit endpoint.
"""

import asyncio
import logging
import signal
import sys
from datetime import datetime, timezone

from dam.interface import DamInterface
from dam.engines.sqs_engine import SQSEngine  # Real SQS engine
from dam.relay import DamRelay
from dam.monitor import DamMonitor
from dam.storage import dam_storage


# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DamRelayService:
    """Background service for dam relay operations"""
    
    def __init__(self):
        """Initialize relay service"""
        # Initialize dam components with real SQS engine
        dam_engine = SQSEngine()
        self.dam_interface = DamInterface(dam_engine)
        self.relay = DamRelay(self.dam_interface)
        self.monitor = DamMonitor(self.dam_interface)
        
        self.is_running = False
        
        dam_storage.log_dam_event("Dam relay service initialized")
    
    async def start(self) -> None:
        """Start the relay service"""
        if self.is_running:
            logger.warning("Relay service is already running")
            return
        
        self.is_running = True
        dam_storage.log_dam_event("Dam relay service started")
        
        try:
            # Start relay in background
            relay_task = asyncio.create_task(self.relay.start())
            
            # Start monitoring in background
            monitor_task = asyncio.create_task(self._monitor_loop())
            
            logger.info("Dam relay service running")
            
            # Wait for tasks
            await asyncio.gather(relay_task, monitor_task)
            
        except Exception as e:
            dam_storage.log_dam_event(f"Relay service error: {str(e)}", "ERROR")
            logger.error(f"Relay service error: {e}")
        finally:
            self.is_running = False
            dam_storage.log_dam_event("Dam relay service stopped")
    
    async def stop(self) -> None:
        """Stop the relay service"""
        if not self.is_running:
            return
        
        dam_storage.log_dam_event("Dam relay service stop requested")
        await self.relay.stop()
        self.is_running = False
    
    async def _monitor_loop(self) -> None:
        """Background monitoring loop"""
        while self.is_running:
            try:
                # Get and log status
                status = await self.monitor.get_status()
                
                # Log important events
                if status["dam_status"]["pending_messages"] > 0:
                    logger.info(f"Dam backlog: {status['dam_status']['pending_messages']} messages")
                
                if status["dam_status"]["last_error"]:
                    logger.warning(f"Dam error: {status['dam_status']['last_error']}")
                
                # Sleep before next check
                await asyncio.sleep(10)  # Check every 10 seconds
                
            except Exception as e:
                logger.error(f"Monitor loop error: {e}")
                await asyncio.sleep(30)  # Wait longer on error
    
    async def get_service_status(self) -> dict:
        """Get relay service status"""
        try:
            dam_status = await self.monitor.get_status()
            relay_stats = await self.relay.get_stats()
            
            return {
                "service": {
                    "is_running": self.is_running,
                    "started_at": datetime.now(timezone.utc).isoformat(),
                },
                "dam": dam_status["dam_status"],
                "relay": relay_stats["relay"],
            }
        except Exception as e:
            return {
                "service": {
                    "is_running": self.is_running,
                    "error": str(e),
                },
                "dam": {"error": str(e)},
                "relay": {"error": str(e)},
            }


# Global service instance
relay_service = DamRelayService()


# Signal handlers for graceful shutdown
def signal_handler(signum, frame):
    """Handle shutdown signals"""
    logger.info(f"Received signal {signum}, shutting down...")
    asyncio.create_task(relay_service.stop())


async def main():
    """Main entry point"""
    # Setup signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    dam_storage.log_dam_event("Starting dam relay service")
    
    try:
        await relay_service.start()
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt")
    except Exception as e:
        dam_storage.log_dam_event(f"Fatal error: {str(e)}", "ERROR")
        logger.error(f"Fatal error: {e}")
    finally:
        await relay_service.stop()
        logger.info("Dam relay service shutdown complete")


if __name__ == "__main__":
    asyncio.run(main())
