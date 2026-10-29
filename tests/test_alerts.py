import os
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from churnguard.monitoring.alerts import (
    ALERTS_ENABLED,
    is_alerts_enabled,
    format_slack_message,
    send_slack_alert,
    trigger_alert_if_high_risk
)
from api.main import app


def test_alerts_enabled_config(monkeypatch):
    # Default is False
    monkeypatch.delenv("ALERTS_ENABLED", raising=False)
    # When env is explicitly false
    monkeypatch.setenv("ALERTS_ENABLED", "false")
    assert is_alerts_enabled() is False

    # When env is explicitly true
    monkeypatch.setenv("ALERTS_ENABLED", "true")
    assert is_alerts_enabled() is True

    # When env is "1" or "yes"
    monkeypatch.setenv("ALERTS_ENABLED", "1")
    assert is_alerts_enabled() is True


def test_format_slack_message():
    payload = format_slack_message(
        customer_id="CUST-12345",
        probability=0.875,
        top_driver="Contract=Month-to-month",
        recommended_action="Offer annual plan discount"
    )
    assert "CUST-12345" in payload["text"]
    assert "87.5%" in payload["text"]
    assert len(payload["blocks"]) >= 2

    # Check fields in section
    section_fields = payload["blocks"][1]["fields"]
    field_texts = [f["text"] for f in section_fields]
    assert any("CUST-12345" in t for t in field_texts)
    assert any("87.5%" in t for t in field_texts)
    assert any("Contract=Month-to-month" in t for t in field_texts)
    assert any("Offer annual plan discount" in t for t in field_texts)


def test_send_slack_alert_when_disabled(monkeypatch):
    monkeypatch.setenv("ALERTS_ENABLED", "false")
    with patch("requests.post") as mock_post:
        result = send_slack_alert(
            customer_id="CUST-100",
            probability=0.92,
            top_driver="high monthly_charges",
            recommended_action="Offer loyalty discount",
            webhook_url="https://hooks.slack.com/services/TEST/MOCK/URL"
        )
        assert result is False
        mock_post.assert_not_called()


def test_send_slack_alert_fallback_when_no_webhook_url(monkeypatch, capsys):
    monkeypatch.setenv("ALERTS_ENABLED", "true")
    monkeypatch.delenv("SLACK_WEBHOOK_URL", raising=False)

    with patch("requests.post") as mock_post:
        result = send_slack_alert(
            customer_id="CUST-200",
            probability=0.88,
            top_driver="total_tickets",
            recommended_action="Escalate to senior CS agent",
            webhook_url=None
        )
        # Fallback console log succeeds and doesn't fail
        assert result is True
        mock_post.assert_not_called()

        captured = capsys.readouterr()
        assert "SLACK ALERT FALLBACK" in captured.out
        assert "CUST-200" in captured.out
        assert "Escalate to senior CS agent" in captured.out


def test_send_slack_alert_success(monkeypatch):
    monkeypatch.setenv("ALERTS_ENABLED", "true")
    test_webhook = "https://hooks.slack.com/services/T00/B00/X00"
    monkeypatch.setenv("SLACK_WEBHOOK_URL", test_webhook)

    mock_resp = MagicMock()
    mock_resp.status_code = 200

    with patch("requests.post", return_value=mock_resp) as mock_post:
        result = send_slack_alert(
            customer_id="CUST-300",
            probability=0.79,
            top_driver="Contract_Month-to-month",
            recommended_action="Offer annual plan discount"
        )
        assert result is True
        mock_post.assert_called_once()
        args, kwargs = mock_post.call_args
        assert args[0] == test_webhook
        assert kwargs["json"]["blocks"] is not None


def test_trigger_alert_only_for_high_risk():
    with patch("churnguard.monitoring.alerts.send_slack_alert") as mock_alert:
        # LOW risk should NOT trigger
        trigger_alert_if_high_risk(
            customer_id="CUST-LOW",
            probability=0.15,
            top_driver="tenure",
            recommended_action="No action needed - standard monitoring",
            risk_badge="LOW"
        )
        mock_alert.assert_not_called()

        # MEDIUM risk should NOT trigger
        trigger_alert_if_high_risk(
            customer_id="CUST-MED",
            probability=0.35,
            top_driver="Contract",
            recommended_action="Send re-engagement email",
            risk_badge="MEDIUM"
        )
        mock_alert.assert_not_called()

        # HIGH risk MUST trigger
        trigger_alert_if_high_risk(
            customer_id="CUST-HIGH",
            probability=0.82,
            top_driver="Contract_Month-to-month",
            recommended_action="Offer annual plan discount",
            risk_badge="HIGH"
        )
        mock_alert.assert_called_once()


def test_predict_endpoint_triggers_alert_for_high_risk(monkeypatch, auth_headers):
    monkeypatch.setenv("ALERTS_ENABLED", "true")
    monkeypatch.setenv("SLACK_WEBHOOK_URL", "https://hooks.slack.com/services/TEST/HIGH/RISK")

    class MockHighPredictor:
        def predict(self, df):
            return {"probability": 0.85, "prediction": 1, "threshold": 0.5}

    class MockExplainer:
        def explain(self, df):
            import pandas as pd
            return pd.DataFrame([
                {"Feature": "categorical__Contract_Month-to-month", "SHAP": 0.40, "Impact": 0.40}
            ])

    monkeypatch.setattr("api.routes.predict.predictor", MockHighPredictor())
    monkeypatch.setattr("churnguard.services.prediction_service.ChurnPredictor", lambda *args, **kwargs: MockHighPredictor())
    monkeypatch.setattr("churnguard.services.prediction_service.SHAPExplainer", lambda *args, **kwargs: MockExplainer())

    with patch("churnguard.monitoring.alerts.send_slack_alert") as mock_alert:
        client = TestClient(app)
        response = client.post("/predict", json={
            "customer_id": "ALERT-TEST-999",
            "Contract": "Month-to-month",
            "MonthlyCharges": 95.0,
            "tenure": 2
        }, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["risk"]["risk_level"] in ["HIGH", "CRITICAL"]

        # Verify alert was triggered
        assert mock_alert.called
        call_kwargs = mock_alert.call_args[1] if mock_alert.call_args[1] else mock_alert.call_args[0]
        # Verify customer_id was passed
        if isinstance(call_kwargs, dict):
            assert call_kwargs["customer_id"] == "ALERT-TEST-999"


def test_predict_endpoint_does_not_trigger_alert_for_low_risk(monkeypatch, auth_headers):
    monkeypatch.setenv("ALERTS_ENABLED", "true")
    monkeypatch.setenv("SLACK_WEBHOOK_URL", "https://hooks.slack.com/services/TEST/LOW/RISK")

    class MockLowPredictor:
        def predict(self, df):
            return {"probability": 0.05, "prediction": 0, "threshold": 0.5}

    class MockExplainer:
        def explain(self, df):
            import pandas as pd
            return pd.DataFrame([
                {"Feature": "numerical__tenure", "SHAP": -0.40, "Impact": -0.40}
            ])

    monkeypatch.setattr("api.routes.predict.predictor", MockLowPredictor())
    monkeypatch.setattr("churnguard.services.prediction_service.ChurnPredictor", lambda *args, **kwargs: MockLowPredictor())
    monkeypatch.setattr("churnguard.services.prediction_service.SHAPExplainer", lambda *args, **kwargs: MockExplainer())

    with patch("churnguard.monitoring.alerts.send_slack_alert") as mock_alert:
        client = TestClient(app)
        response = client.post("/predict", json={
            "customer_id": "LOW-RISK-111",
            "Contract": "Two year",
            "MonthlyCharges": 20.0,
            "tenure": 60
        }, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["risk"]["risk_level"] == "LOW"

        # Verify alert was NOT called
        assert not mock_alert.called
