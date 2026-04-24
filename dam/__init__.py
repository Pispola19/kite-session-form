"""
Kite Session Dam System

External dam for persistent data retention before /submit ingestion.
SQS active, Kafka-ready architecture.
"""

from .interface import DamInterface
from .relay import DamRelay
from .monitor import DamMonitor

__version__ = "1.0.0"
__all__ = ["DamInterface", "DamRelay", "DamMonitor"]
