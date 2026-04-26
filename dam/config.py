"""
Dam Configuration

Central configuration for dam engines and components.
"""

from typing import Dict, Any, Optional
import os
from pathlib import Path

# Load environment variables from .env file if it exists
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / ".env")
except ImportError:
    # dotenv not available, will use environment variables only
    pass


def _getenv_first(*names: str, default: Optional[str] = None) -> Optional[str]:
    """Return the first non-empty environment variable from a prioritized list."""
    for name in names:
        value = os.getenv(name)
        if value:
            return value
    return default


class DamConfig:
    """Configuration for dam system"""
    
    def __init__(self):
        # Engine selection
        self.active_engine = os.getenv("DAM_ENGINE", "sqs")  # "sqs" or "kafka"
        
        # SQS Configuration
        self.sqs_queue_url = _getenv_first(
            "DAM_SQS_QUEUE_URL",
            "SQS_QUEUE_URL",
            default="https://sqs.us-east-1.amazonaws.com/123456789012/kite-sessions-dam.fifo"
        )
        self.sqs_region = _getenv_first(
            "DAM_SQS_REGION",
            "AWS_REGION",
            "AWS_DEFAULT_REGION",
            default="us-east-1"
        )
        self.sqs_message_group_id = os.getenv("DAM_SQS_MESSAGE_GROUP_ID", "kite-sessions")
        self.sqs_visibility_timeout = int(os.getenv("DAM_SQS_VISIBILITY_TIMEOUT", "300"))
        self.sqs_message_retention_period = int(os.getenv("DAM_SQS_MESSAGE_RETENTION_PERIOD", "1209600"))  # 14 days
        
        # Kafka Configuration (ready but not active)
        self.kafka_bootstrap_servers = os.getenv(
            "DAM_KAFKA_BOOTSTRAP_SERVERS", 
            "localhost:9092"
        ).split(",")
        self.kafka_topic_name = os.getenv("DAM_KAFKA_TOPIC", "kite-sessions")
        self.kafka_consumer_group = os.getenv("DAM_KAFKA_CONSUMER_GROUP", "dam-relay")
        
        # Relay Configuration
        self.relay_submit_url = os.getenv("DAM_RELAY_SUBMIT_URL", "http://localhost:8080/submit")
        self.relay_batch_size = int(os.getenv("DAM_RELAY_BATCH_SIZE", "5"))
        self.relay_poll_interval = float(os.getenv("DAM_RELAY_POLL_INTERVAL", "2.0"))
        self.relay_max_retries = int(os.getenv("DAM_RELAY_MAX_RETRIES", "3"))
        self.relay_retry_delay = float(os.getenv("DAM_RELAY_RETRY_DELAY", "1.0"))
        self.relay_max_per_minute = int(os.getenv("DAM_RELAY_MAX_PER_MINUTE", "60"))
        self.relay_token_bucket_capacity = float(os.getenv("DAM_RELAY_TOKEN_BUCKET_CAPACITY", "10"))
        self.relay_backlog_warning = int(os.getenv("DAM_RELAY_BACKLOG_WARNING", "200"))
        self.relay_backlog_critical = int(os.getenv("DAM_RELAY_BACKLOG_CRITICAL", "800"))
        self.relay_rate_normal = int(os.getenv("DAM_RELAY_RATE_NORMAL", "60"))
        self.relay_rate_warning = int(os.getenv("DAM_RELAY_RATE_WARNING", "30"))
        self.relay_rate_critical = int(os.getenv("DAM_RELAY_RATE_CRITICAL", "10"))
        self.relay_circuit_failures = int(os.getenv("DAM_RELAY_CIRCUIT_FAILURES", "5"))
        self.relay_circuit_sleep = float(os.getenv("DAM_RELAY_CIRCUIT_SLEEP", "60"))
        self.relay_retry_visibility_1 = int(os.getenv("DAM_RELAY_RETRY_VISIBILITY_1", "60"))
        self.relay_retry_visibility_2 = int(os.getenv("DAM_RELAY_RETRY_VISIBILITY_2", "120"))
        self.relay_retry_visibility_max = int(os.getenv("DAM_RELAY_RETRY_VISIBILITY_MAX", "300"))
        self.relay_state_file = os.getenv(
            "DAM_RELAY_STATE_FILE",
            "/Users/PER_TEST/monitor_kite_safe/runtime/relay_state.json",
        )
        self.relay_quarantine_path = os.getenv(
            "DAM_RELAY_QUARANTINE_PATH",
            "/Users/PER_TEST/raccolta_dati_K_test/dam/quarantine/poison_messages.jsonl",
        )
        self.relay_worker_guard_enabled = os.getenv("DAM_RELAY_WORKER_GUARD_ENABLED", "0").strip().lower() in (
            "1",
            "true",
            "yes",
        )
        
        # Monitor Configuration
        self.monitor_update_interval = float(os.getenv("DAM_MONITOR_UPDATE_INTERVAL", "5.0"))
        
        # Logging
        self.log_level = os.getenv("DAM_LOG_LEVEL", "INFO")
        self.log_file = Path(os.getenv("DAM_LOG_FILE", "/Users/PER_TEST/system.log"))
    
    def get_sqs_config(self) -> Dict[str, Any]:
        """Get SQS configuration"""
        return {
            "queue_url": self.sqs_queue_url,
            "region": self.sqs_region,
            "message_group_id": self.sqs_message_group_id,
            "visibility_timeout": self.sqs_visibility_timeout,
            "message_retention_period": self.sqs_message_retention_period,
        }
    
    def get_kafka_config(self) -> Dict[str, Any]:
        """Get Kafka configuration"""
        return {
            "bootstrap_servers": self.kafka_bootstrap_servers,
            "topic_name": self.kafka_topic_name,
            "consumer_group": self.kafka_consumer_group,
        }
    
    def get_relay_config(self) -> Dict[str, Any]:
        """Get relay configuration"""
        return {
            "submit_url": self.relay_submit_url,
            "batch_size": self.relay_batch_size,
            "poll_interval": self.relay_poll_interval,
            "max_retries": self.relay_max_retries,
            "retry_delay": self.relay_retry_delay,
            "max_per_minute": self.relay_max_per_minute,
            "token_bucket_capacity": self.relay_token_bucket_capacity,
            "backlog_warning": self.relay_backlog_warning,
            "backlog_critical": self.relay_backlog_critical,
            "rate_normal": self.relay_rate_normal,
            "rate_warning": self.relay_rate_warning,
            "rate_critical": self.relay_rate_critical,
            "circuit_failures": self.relay_circuit_failures,
            "circuit_sleep": self.relay_circuit_sleep,
            "retry_visibility_1": self.relay_retry_visibility_1,
            "retry_visibility_2": self.relay_retry_visibility_2,
            "retry_visibility_max": self.relay_retry_visibility_max,
            "state_file": self.relay_state_file,
            "quarantine_path": self.relay_quarantine_path,
            "worker_guard_enabled": self.relay_worker_guard_enabled,
        }
    
    def is_sqs_active(self) -> bool:
        """Check if SQS is the active engine"""
        return self.active_engine.lower() == "sqs"
    
    def is_kafka_active(self) -> bool:
        """Check if Kafka is the active engine"""
        return self.active_engine.lower() == "kafka"
    
    def validate(self) -> bool:
        """Validate configuration"""
        if self.is_sqs_active():
            return bool(self.sqs_queue_url and self.sqs_region)
        elif self.is_kafka_active():
            return bool(self.kafka_bootstrap_servers and self.kafka_topic_name)
        return False


# Global configuration instance
dam_config = DamConfig()
