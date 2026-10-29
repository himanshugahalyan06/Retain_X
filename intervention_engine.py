"""
Top-level entrypoint for intervention_engine.
Forwards all components from churnguard.retention.intervention_engine.
"""

from churnguard.retention.intervention_engine import (
    InterventionEngine,
    InterventionRule,
    default_intervention_engine,
    get_recommended_action
)

__all__ = [
    "InterventionEngine",
    "InterventionRule",
    "default_intervention_engine",
    "get_recommended_action"
]
