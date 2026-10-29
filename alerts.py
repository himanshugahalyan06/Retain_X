"""
Root-level entrypoint for alerts module.
Forwards all components from churnguard.monitoring.alerts.
"""

from churnguard.monitoring.alerts import (
    ALERTS_ENABLED,
    is_alerts_enabled,
    format_slack_message,
    send_slack_alert,
    trigger_alert_if_high_risk
)

__all__ = [
    "ALERTS_ENABLED",
    "is_alerts_enabled",
    "format_slack_message",
    "send_slack_alert",
    "trigger_alert_if_high_risk"
]
