"""
Automated Alerting System for ChurnGuard.

Sends asynchronous notifications to Slack webhook when high-risk churn customers
are detected, with fallback console logging and configurable toggling.
"""

import os
import logging
import threading
from typing import Dict, Any, Optional
try:
    import requests
except ImportError:
    requests = None

logger = logging.getLogger(__name__)

# Config flag defaults to False (can be overridden via environment or variable)
ALERTS_ENABLED = os.getenv("ALERTS_ENABLED", "false").lower() in ("true", "1", "yes")


def is_alerts_enabled() -> bool:
    """
    Check if automated alerts are currently enabled.
    Evaluates both the module-level flag and the ALERTS_ENABLED environment variable.
    """
    env_val = os.getenv("ALERTS_ENABLED", "").strip().lower()
    if env_val in ("true", "1", "yes"):
        return True
    if env_val in ("false", "0", "no"):
        return False
    return ALERTS_ENABLED


def format_slack_message(
    customer_id: str,
    probability: float,
    top_driver: str,
    recommended_action: str
) -> Dict[str, Any]:
    """
    Format rich Slack webhook message payload.
    """
    prob_str = f"{probability:.1%}" if isinstance(probability, (int, float)) else str(probability)
    return {
        "text": f"🚨 High Risk Customer Alert: {customer_id} ({prob_str} risk)",
        "blocks": [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": "🚨 High Churn Risk Customer Detected",
                    "emoji": True
                }
            },
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"*Customer ID:*\n`{customer_id}`"},
                    {"type": "mrkdwn", "text": f"*Risk Probability:*\n`{prob_str}` ({probability:.4f})"},
                    {"type": "mrkdwn", "text": f"*Top SHAP Driver:*\n{top_driver}"},
                    {"type": "mrkdwn", "text": f"*Recommended Action:*\n🎯 {recommended_action}"}
                ]
            }
        ]
    }


def send_slack_alert(
    customer_id: str,
    probability: float,
    top_driver: str,
    recommended_action: str,
    webhook_url: Optional[str] = None
) -> bool:
    """
    Send a Slack webhook alert for a high-risk customer.
    
    If SLACK_WEBHOOK_URL is not set in environment or provided,
    falls back to console logging without raising an exception.
    """
    if not is_alerts_enabled():
        logger.debug("Alerts are disabled (ALERTS_ENABLED is False). Skipping notification.")
        return False

    url = webhook_url or os.getenv("SLACK_WEBHOOK_URL", "").strip()

    if not url:
        # Fallback to console/logger when webhook URL is not configured
        fallback_msg = (
            f"[SLACK ALERT FALLBACK - NO WEBHOOK URL]\n"
            f"  • Customer ID: {customer_id}\n"
            f"  • Risk Probability: {probability:.1%} ({probability:.4f})\n"
            f"  • Top SHAP Driver: {top_driver}\n"
            f"  • Recommended Action: {recommended_action}"
        )
        print(fallback_msg)
        logger.warning(fallback_msg)
        return True

    # Send webhook POST request
    payload = format_slack_message(
        customer_id=customer_id,
        probability=probability,
        top_driver=top_driver,
        recommended_action=recommended_action
    )

    try:
        response = requests.post(url, json=payload, timeout=5)
        if response.status_code == 200:
            logger.info(f"Slack alert successfully delivered for customer {customer_id}")
            return True
        else:
            logger.error(
                f"Slack alert delivery failed with status {response.status_code}: {response.text}"
            )
            return False
    except Exception as e:
        logger.error(f"Exception encountered while sending Slack alert to webhook: {e}")
        return False


def trigger_alert_if_high_risk(
    customer_id: str,
    probability: float,
    top_driver: str,
    recommended_action: str,
    risk_badge: str,
    background_tasks: Optional[Any] = None
) -> None:
    """
    Asynchronously and non-blockingly triggers a high-risk alert if risk_badge is High/Critical.
    Uses FastAPI BackgroundTasks if provided, otherwise dispatches via a daemon background thread.
    """
    normalized_risk = (risk_badge or "").strip().upper()
    if normalized_risk not in ["HIGH", "CRITICAL"]:
        return

    if background_tasks is not None and hasattr(background_tasks, "add_task"):
        background_tasks.add_task(
            send_slack_alert,
            customer_id=customer_id,
            probability=probability,
            top_driver=top_driver,
            recommended_action=recommended_action
        )
    else:
        # Non-blocking fire-and-forget daemon thread
        t = threading.Thread(
            target=send_slack_alert,
            kwargs={
                "customer_id": customer_id,
                "probability": probability,
                "top_driver": top_driver,
                "recommended_action": recommended_action
            },
            daemon=True
        )
        t.start()
