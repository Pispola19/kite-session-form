"""
Dam Ingest Endpoint - External dam entry point

Receives external payloads and enqueues them to the dam system.
Acts as the external dam interface before /submit.
"""

import json
import logging
import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from dam.interface import DamInterface, DamMessage
from dam.engines.sqs_engine import SQSEngine  # Real SQS engine
from dam.storage import dam_storage
from dam.config import dam_config


# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI app
app = FastAPI(title="Kite Session Dam Ingest", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize dam interface with real SQS engine
dam_engine = SQSEngine()
dam_interface = DamInterface(dam_engine)


@app.post("/dam/submit")
async def dam_submit(request: Request) -> Dict[str, Any]:
    """
    Dam submit endpoint - receives external payloads
    
    This is the external dam entry point that receives payloads
    and stores them in the dam before relay to /submit.
    """
    try:
        # Get payload
        payload = await request.json()
        
        # Validate payload structure
        if not isinstance(payload, dict):
            raise HTTPException(status_code=400, detail="Payload must be JSON object")
        
        # Validate required fields
        required_fields = ["message_id", "session_id", "technical_id", "event_ts", "src"]
        for field in required_fields:
            if field not in payload:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        # Extract business payload
        business_payload = {k: v for k, v in payload.items() if k not in required_fields}
        
        # Create dam message
        dam_message = DamMessage(
            message_id=payload["message_id"],
            session_id=payload["session_id"],
            technical_id=payload["technical_id"],
            event_ts=payload["event_ts"],
            src=payload["src"],
            payload=business_payload,
            received_at=datetime.now(timezone.utc)
        )
        
        # Enqueue to dam
        success = await dam_interface.enqueue(dam_message)
        
        if success:
            dam_storage.log_dam_event(f"Message enqueued to dam: {dam_message.message_id}")
            
            return {
                "ok": True,
                "durable": True,
                "dam_received": True,
                "message_id": dam_message.message_id,
                "received_at": dam_message.received_at.isoformat(),
                "engine_type": dam_interface.engine_type,
                "queue_status": "enqueued"
            }
        else:
            dam_storage.log_dam_event(f"Failed to enqueue message: {dam_message.message_id}", "ERROR")
            raise HTTPException(status_code=500, detail="Failed to enqueue message to dam")
            
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
    except HTTPException:
        raise
    except Exception as e:
        dam_storage.log_dam_event(f"Dam submit error: {str(e)}", "ERROR")
        logger.error(f"Dam submit error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/dam/status")
async def dam_status() -> Dict[str, Any]:
    """Get dam status and statistics"""
    try:
        stats = await dam_interface.get_stats()
        health = await dam_interface.health_check()
        
        return {
            "dam_status": "healthy" if health else "unhealthy",
            "engine_type": stats.engine_type,
            "pending_messages": stats.pending_messages,
            "total_messages": stats.total_messages,
            "oldest_message_age_seconds": stats.oldest_message_age_seconds,
            "last_write_at": stats.last_write_at.isoformat() if stats.last_write_at else None,
            "last_release_at": stats.last_release_at.isoformat() if stats.last_release_at else None,
            "last_error": stats.last_error,
            "configuration": {
                "active_engine": dam_config.active_engine,
                "relay_submit_url": dam_config.relay_submit_url,
                "relay_batch_size": dam_config.relay_batch_size,
            }
        }
        
    except Exception as e:
        logger.error(f"Dam status error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get dam status")


@app.get("/dam/health")
async def dam_health() -> Dict[str, Any]:
    """Simple health check endpoint"""
    try:
        health = await dam_interface.health_check()
        return {
            "healthy": health,
            "engine": dam_interface.engine_type,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Dam health check error: {e}")
        return {
            "healthy": False,
            "engine": dam_interface.engine_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "error": str(e)
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8081)
