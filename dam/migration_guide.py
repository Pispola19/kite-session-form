"""
Kafka Migration Guide - Documentation for SQS to Kafka migration

This module provides documentation and utilities for future migration
from SQS to Kafka while maintaining system stability.
"""

import logging
from typing import Dict, Any, List
from datetime import datetime, timezone

from dam.config import dam_config
from dam.engine_factory import DamEngineFactory
from dam.kafka_ready import kafka_ready_interface, kafka_migration


logger = logging.getLogger(__name__)


class KafkaMigrationGuide:
    """Guide and utilities for Kafka migration"""
    
    def __init__(self):
        """Initialize migration guide"""
        self.migration_phases = [
            {
                "phase": 1,
                "name": "Preparation",
                "description": "Validate Kafka configuration and infrastructure",
                "steps": [
                    "Validate Kafka cluster connectivity",
                    "Create required topics",
                    "Test producer/consumer functionality",
                    "Configure security and authentication"
                ],
                "estimated_time": "1-2 days",
                "risk_level": "low"
            },
            {
                "phase": 2,
                "name": "Dual Write",
                "description": "Enable dual write to both SQS and Kafka",
                "steps": [
                    "Modify dam to write to both engines",
                    "Implement write verification",
                    "Monitor dual write performance",
                    "Handle write failures gracefully"
                ],
                "estimated_time": "2-3 days",
                "risk_level": "medium"
            },
            {
                "phase": 3,
                "name": "Dual Read",
                "description": "Enable dual read from both engines",
                "steps": [
                    "Implement read from both engines",
                    "Add deduplication logic",
                    "Monitor read performance",
                    "Handle read failures gracefully"
                ],
                "estimated_time": "3-4 days",
                "risk_level": "medium"
            },
            {
                "phase": 4,
                "name": "Kafka Primary",
                "description": "Switch to Kafka as primary engine",
                "steps": [
                    "Change primary engine to Kafka",
                    "Keep SQS as backup",
                    "Monitor system stability",
                    "Prepare rollback plan"
                ],
                "estimated_time": "1-2 days",
                "risk_level": "high"
            },
            {
                "phase": 5,
                "name": "SQS Decommission",
                "description": "Remove SQS dependency",
                "steps": [
                    "Verify Kafka stability",
                    "Remove SQS configuration",
                    "Clean up SQS resources",
                    "Update documentation"
                ],
                "estimated_time": "1 day",
                "risk_level": "low"
            }
        ]
    
    def get_migration_plan(self) -> Dict[str, Any]:
        """Get complete migration plan"""
        return {
            "overview": {
                "description": "Migration from SQS to Kafka for dam system",
                "total_phases": len(self.migration_phases),
                "estimated_total_time": "8-12 days",
                "overall_risk": "medium",
                "rollback_available": True
            },
            "current_status": self._get_current_migration_status(),
            "phases": self.migration_phases,
            "prerequisites": self._get_prerequisites(),
            "rollback_plan": self._get_rollback_plan(),
            "validation_checks": self._get_validation_checks()
        }
    
    def _get_current_migration_status(self) -> Dict[str, Any]:
        """Get current migration status"""
        kafka_config = dam_config.get_kafka_config()
        
        return {
            "current_engine": dam_config.active_engine,
            "kafka_configured": bool(kafka_config.get("bootstrap_servers")),
            "kafka_topics_created": False,  # Would check actual Kafka
            "dual_write_enabled": False,
            "dual_read_enabled": False,
            "migration_phase": 0,  # Not started
            "ready_for_migration": self._is_ready_for_migration()
        }
    
    def _is_ready_for_migration(self) -> bool:
        """Check if ready for migration"""
        try:
            # Validate Kafka configuration
            kafka_config = dam_config.get_kafka_config()
            required_fields = ["bootstrap_servers", "topic_name", "consumer_group"]
            
            if not all(field in kafka_config for field in required_fields):
                return False
            
            # Check if Kafka dependencies are available
            try:
                import confluent_kafka
                return True
            except ImportError:
                logger.warning("confluent-kafka not available for Kafka migration")
                return False
                
        except Exception as e:
            logger.error(f"Error checking migration readiness: {e}")
            return False
    
    def _get_prerequisites(self) -> List[str]:
        """Get migration prerequisites"""
        return [
            "Kafka cluster deployed and accessible",
            "Required topics created with appropriate configuration",
            "Security and authentication configured",
            "confluent-kafka Python package installed",
            "Backup strategy in place",
            "Monitoring and alerting configured",
            "Rollback procedure documented and tested"
        ]
    
    def _get_rollback_plan(self) -> Dict[str, Any]:
        """Get rollback plan"""
        return {
            "trigger_conditions": [
                "Kafka connectivity issues",
                "Performance degradation > 20%",
                "Data loss or corruption detected",
                "System instability"
            ],
            "rollback_steps": [
                "Switch back to SQS as primary engine",
                "Disable dual write/read",
                "Verify system stability",
                "Investigate root cause",
                "Document incident"
            ],
            "rollback_time": "5-10 minutes",
            "data_consistency": "Maintained through dual write phase"
        }
    
    def _get_validation_checks(self) -> List[Dict[str, Any]]:
        """Get validation checks for each phase"""
        return [
            {
                "phase": 1,
                "checks": [
                    "Kafka cluster connectivity test",
                    "Topic creation verification",
                    "Producer/consumer functionality test",
                    "Security authentication test"
                ]
            },
            {
                "phase": 2,
                "checks": [
                    "Dual write functionality test",
                    "Write consistency verification",
                    "Performance impact assessment",
                    "Failure handling verification"
                ]
            },
            {
                "phase": 3,
                "checks": [
                    "Dual read functionality test",
                    "Deduplication logic verification",
                    "Read performance assessment",
                    "Data consistency verification"
                ]
            },
            {
                "phase": 4,
                "checks": [
                    "Kafka primary functionality test",
                    "System stability verification",
                    "Rollback procedure test",
                    "Performance benchmark comparison"
                ]
            },
            {
                "phase": 5,
                "checks": [
                    "SQS decommission safety check",
                    "System final verification",
                    "Documentation update",
                    "Team training completion"
                ]
            }
        ]
    
    def get_migration_checklist(self, phase: int) -> List[str]:
        """Get detailed checklist for specific phase"""
        if phase < 1 or phase > len(self.migration_phases):
            return []
        
        phase_info = self.migration_phases[phase - 1]
        
        # Expand based on phase
        if phase == 1:  # Preparation
            return [
                "✓ Kafka cluster deployed and accessible",
                "✓ Topics created with correct configuration",
                "✓ Security and authentication configured",
                "✓ confluent-kafka package installed",
                "✓ Backup strategy implemented",
                "✓ Monitoring configured",
                "✓ Rollback procedure documented"
            ]
        elif phase == 2:  # Dual Write
            return [
                "✓ Dual write code implemented",
                "✓ Write verification logic added",
                "✓ Performance monitoring enabled",
                "✓ Failure handling implemented",
                "✓ Write consistency verified",
                "✓ Alerting configured for write failures"
            ]
        elif phase == 3:  # Dual Read
            return [
                "✓ Dual read code implemented",
                "✓ Deduplication logic added",
                "✓ Read performance verified",
                "✓ Data consistency validated",
                "✓ Failure handling implemented",
                "✓ Alerting configured for read failures"
            ]
        elif phase == 4:  # Kafka Primary
            return [
                "✓ Kafka primary switch completed",
                "✓ SQS backup maintained",
                "✓ System stability verified",
                "✓ Rollback procedure tested",
                "✓ Performance benchmarks completed"
            ]
        elif phase == 5:  # SQS Decommission
            return [
                "✓ Kafka stability confirmed",
                "✓ SQS configuration removed",
                "✓ SQS resources cleaned up",
                "✓ Documentation updated",
                "✓ Team trained on new system"
            ]
        
        return []
    
    def estimate_migration_cost(self) -> Dict[str, Any]:
        """Estimate migration cost and resources"""
        return {
            "development_time": "8-12 days",
            "testing_time": "3-5 days",
            "deployment_time": "1-2 days",
            "total_time": "12-19 days",
            "team_size": "2-3 engineers",
            "risk_factors": [
                "Kafka cluster stability",
                "Data consistency during migration",
                "Performance impact",
                "Complexity of dual operations"
            ],
            "mitigation_strategies": [
                "Comprehensive testing",
                "Gradual rollout",
                "Real-time monitoring",
                "Quick rollback capability"
            ]
        }


# Global migration guide instance
kafka_migration_guide = KafkaMigrationGuide()
