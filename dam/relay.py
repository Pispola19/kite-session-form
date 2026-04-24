"""
Dam Relay - Disciplined relay to /submit

Reads from dam and releases to POST /submit with proper retry logic.
Only talks to /submit and monitor read-only.
"""

import json
import logging
import asyncio
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone

from .interface import DamMessage, DamInterface
from .config import dam_config

# Conditional import for aiohttp
try:
    import aiohttp
    AIOHTTP_AVAILABLE = True
except ImportError:
    AIOHTTP_AVAILABLE = False


logger = logging.getLogger(__name__)


class DamRelay:
    """Relay that moves messages from dam to /submit endpoint"""
    
    def __init__(self, dam_interface: DamInterface, config: Optional[Dict[str, Any]] = None):
        """
        Initialize dam relay.
        
        Args:
            dam_interface: Dam interface for claiming/acking messages
            config: Relay configuration (overrides dam_config if provided)
        """
        self.dam = dam_interface
        self.config = config or dam_config.get_relay_config()
        
        self.submit_url = self.config["submit_url"]
        self.batch_size = self.config["batch_size"]
        self.poll_interval = self.config["poll_interval"]
        self.max_retries = self.config["max_retries"]
        self.retry_delay = self.config["retry_delay"]
        
        # Relay state
        self.is_running = False
        self._last_release_at: Optional[datetime] = None
        self._last_error: Optional[str] = None
        self._processed_count = 0
        self._error_count = 0
        
        logger.info(f"Dam relay initialized for {self.submit_url}")
    
    async def start(self) -> None:
        """Start the relay process"""
        if self.is_running:
            logger.warning("Relay is already running")
            return
        
        self.is_running = True
        logger.info("Dam relay started")
        
        try:
            while self.is_running:
                await self._process_batch()
                await asyncio.sleep(self.poll_interval)
        except Exception as e:
            self._last_error = str(e)
            logger.error(f"Relay process error: {e}")
        finally:
            self.is_running = False
            logger.info("Dam relay stopped")
    
    async def stop(self) -> None:
        """Stop the relay process"""
        self.is_running = False
        logger.info("Dam relay stop requested")
    
    async def _process_batch(self) -> None:
        """Process a batch of messages from dam"""
        try:
            # Claim batch from dam
            messages = await self.dam.claim_batch(
                max_messages=self.batch_size,
                claim_timeout_seconds=int(self.poll_interval)
            )
            
            if not messages:
                return
            
            logger.info(f"Claimed {len(messages)} messages from dam")
            
            # Process each message
            for message in messages:
                success = await self._release_to_submit(message)
                
                if success:
                    # Acknowledge successful processing
                    ack_success = await self.dam.ack(message)
                    if ack_success:
                        self._processed_count += 1
                        self._last_release_at = datetime.now(timezone.utc)
                        logger.info(f"Message released and acknowledged: {message.message_id}")
                    else:
                        logger.error(f"Failed to acknowledge message: {message.message_id}")
                        self._error_count += 1
                else:
                    # Retry failed message
                    retry_success = await self.dam.retry(message)
                    if not retry_success:
                        logger.error(f"Failed to retry message: {message.message_id}")
                        self._error_count += 1
                    
        except Exception as e:
            self._last_error = str(e)
            logger.error(f"Batch processing error: {e}")
            self._error_count += 1
    
    async def _release_to_submit(self, message: DamMessage) -> bool:
        """Release single message to /submit endpoint"""
        if not AIOHTTP_AVAILABLE:
            logger.error("aiohttp not available - cannot submit to /submit")
            self._last_error = "aiohttp not available"
            return False
        
        payload = {
            "message_id": message.message_id,
            "session_id": message.session_id,
            "technical_id": message.technical_id,
            "event_ts": message.event_ts,
            "src": message.src,
            **message.payload  # Include all business payload fields
        }
        
        for attempt in range(self.max_retries + 1):
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(
                        self.submit_url,
                        json=payload,
                        headers={"Content-Type": "application/json"},
                        timeout=aiohttp.ClientTimeout(total=30)
                    ) as response:
                        if response.status == 200:
                            response_data = await response.json()
                            if response_data.get("ok") and response_data.get("durable"):
                                logger.info(f"Message submitted successfully: {message.message_id}")
                                return True
                            else:
                                error_msg = response_data.get("reason", "Unknown error")
                                logger.warning(f"Submit rejected for {message.message_id}: {error_msg}")
                        else:
                            logger.warning(f"Submit failed for {message.message_id}: HTTP {response.status}")
                
                # If not last attempt, wait before retry
                if attempt < self.max_retries:
                    await asyncio.sleep(self.retry_delay * (2 ** attempt))  # Exponential backoff
                    
            except asyncio.TimeoutError:
                logger.warning(f"Submit timeout for {message.message_id} (attempt {attempt + 1})")
                if attempt < self.max_retries:
                    await asyncio.sleep(self.retry_delay * (2 ** attempt))
            except Exception as e:
                logger.warning(f"Submit error for {message.message_id} (attempt {attempt + 1}): {e}")
                if attempt < self.max_retries:
                    await asyncio.sleep(self.retry_delay * (2 ** attempt))
        
        # All retries failed
        self._last_error = f"All {self.max_retries + 1} submit attempts failed"
        logger.error(f"Submit failed after all retries for {message.message_id}")
        return False
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get relay statistics"""
        dam_stats = await self.dam.get_stats()
        
        return {
            "relay": {
                "is_running": self.is_running,
                "processed_count": self._processed_count,
                "error_count": self._error_count,
                "last_release_at": self._last_release_at.isoformat() if self._last_release_at else None,
                "last_error": self._last_error,
                "submit_url": self.submit_url,
                "batch_size": self.batch_size,
                "poll_interval": self.poll_interval,
            },
            "dam": {
                "engine_type": dam_stats.engine_type,
                "pending_messages": dam_stats.pending_messages,
                "oldest_message_age_seconds": dam_stats.oldest_message_age_seconds,
                "last_write_at": dam_stats.last_write_at.isoformat() if dam_stats.last_write_at else None,
                "last_release_at": dam_stats.last_release_at.isoformat() if dam_stats.last_release_at else None,
                "last_error": dam_stats.last_error,
            }
        }
    
    async def health_check(self) -> bool:
        """Check relay health"""
        if not AIOHTTP_AVAILABLE:
            self._last_error = "aiohttp not available"
            return False
            
        try:
            # Check dam health
            dam_healthy = await self.dam.health_check()
            
            # Check submit endpoint availability
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    self.submit_url.replace("/submit", "/health"),
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as response:
                    submit_healthy = response.status == 200
            
            return dam_healthy and submit_healthy
            
        except Exception as e:
            self._last_error = str(e)
            logger.error(f"Health check error: {e}")
            return False
