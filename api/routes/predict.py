import time
import random
import pandas as pd
from typing import Dict, Any
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy.orm import Session

from api.dependencies import predictor, get_db
from api.schemas import CustomerRequest, PredictResponse
from churnguard.database.models import (
    User,
    Customer,
    Prediction,
    RetentionDecision,
    CustomerBehavioralData,
    CustomerCRMData,
    CustomerSupportData,
    CustomerPaymentData
)
from churnguard.services.prediction_service import PredictionService
from churnguard.services.retention_service import RetentionService
from churnguard.retention.intervention_engine import default_intervention_engine
from churnguard.monitoring.logger import PredictionLogger
from churnguard.monitoring.alerts import trigger_alert_if_high_risk
from churnguard.auth.dependencies import get_current_active_user

router = APIRouter()

ENRICHED_FIELD_NAMES = {
    "login_frequency", "feature_usage_count", "avg_session_duration_minutes",
    "last_active_date", "days_since_last_login", "lifecycle_stage",
    "account_owner", "deal_value", "last_contact_date", "total_tickets",
    "avg_resolution_time_hours", "last_csat_score", "failed_payments_count",
    "plan_downgrades_count", "days_since_last_payment_delay",
    "behavioral", "crm", "support", "payment"
}

@router.post("/predict")
@router.post("/v1/predictions")
def predict_customer_endpoint(
    customer: CustomerRequest,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Predict churn probability for a customer, calculate economic value, estimate intervention uplift,
    and return Next Best Action recommendation.
    """
    start = time.time()
    try:
        raw_customer_data = customer.model_dump() if hasattr(customer, 'model_dump') else customer.dict()
        
        customer_id = raw_customer_data.get("customer_id")
        if not customer_id:
            customer_id = f"CG-{random.randint(10000, 99999)}"
            raw_customer_data["customer_id"] = customer_id

        # Flatten nested enriched dictionaries if present for model prediction
        pred_input = {k: v for k, v in raw_customer_data.items() if k not in ["behavioral", "crm", "support", "payment"]}
        for domain in ["behavioral", "crm", "support", "payment"]:
            domain_dict = raw_customer_data.get(domain)
            if isinstance(domain_dict, dict):
                for dk, dv in domain_dict.items():
                    if dv is not None:
                        pred_input[dk] = dv

        pred_service = PredictionService(predictor=predictor, db_session=db)
        pred_analysis = pred_service.predict_customer(pred_input, company_id=current_user.company_id)

        prob = pred_analysis["churn_probability"]
        pred_val = pred_analysis["prediction"]
        threshold = pred_analysis["threshold"]
        econ_value = pred_analysis["economic_value"]["estimated_economic_value"]

        company_id = current_user.company_id

        # 1. Upsert Customer Record
        db_cust = db.query(Customer).filter(Customer.customer_id == customer_id).first()
        if not db_cust:
            db_cust = Customer(customer_id=customer_id, company_id=company_id)
            db.add(db_cust)
        else:
            db_cust.company_id = company_id

        for k, v in pred_input.items():
            if hasattr(db_cust, k):
                setattr(db_cust, k, v)

        db_cust.risk_segment = pred_analysis["risk_segment"]
        db_cust.value_segment = pred_analysis["value_segment"]
        db_cust.combined_segment = pred_analysis["combined_segment"]

        # 1b. Upsert Enriched Domain Data (Behavioral, CRM, Support, Payment)
        # Behavioral
        beh_dict = raw_customer_data.get("behavioral") or {}
        if not isinstance(beh_dict, dict):
            beh_dict = {}
        login_freq = raw_customer_data.get("login_frequency") or beh_dict.get("login_frequency")
        feat_usage = raw_customer_data.get("feature_usage_count") or beh_dict.get("feature_usage_count")
        session_dur = raw_customer_data.get("avg_session_duration_minutes") or beh_dict.get("avg_session_duration_minutes")
        last_active = raw_customer_data.get("last_active_date") or beh_dict.get("last_active_date")
        days_since_login = raw_customer_data.get("days_since_last_login") or beh_dict.get("days_since_last_login")

        if any(x is not None for x in [login_freq, feat_usage, session_dur, last_active, days_since_login]):
            b_row = db.query(CustomerBehavioralData).filter(CustomerBehavioralData.customer_id == customer_id).first()
            if not b_row:
                b_row = CustomerBehavioralData(customer_id=customer_id, company_id=company_id)
                db.add(b_row)
            else:
                b_row.company_id = company_id
            if login_freq is not None: b_row.login_frequency = float(login_freq)
            if feat_usage is not None: b_row.feature_usage_count = int(feat_usage)
            if session_dur is not None: b_row.avg_session_duration_minutes = float(session_dur)
            if last_active is not None: b_row.last_active_date = last_active
            if days_since_login is not None: b_row.days_since_last_login = int(days_since_login)

        # CRM
        crm_dict = raw_customer_data.get("crm") or {}
        if not isinstance(crm_dict, dict):
            crm_dict = {}
        lifecycle = raw_customer_data.get("lifecycle_stage") or crm_dict.get("lifecycle_stage")
        owner = raw_customer_data.get("account_owner") or crm_dict.get("account_owner")
        d_val = raw_customer_data.get("deal_value") or crm_dict.get("deal_value")
        last_contact = raw_customer_data.get("last_contact_date") or crm_dict.get("last_contact_date")

        if any(x is not None for x in [lifecycle, owner, d_val, last_contact]):
            c_row = db.query(CustomerCRMData).filter(CustomerCRMData.customer_id == customer_id).first()
            if not c_row:
                c_row = CustomerCRMData(customer_id=customer_id, company_id=company_id)
                db.add(c_row)
            else:
                c_row.company_id = company_id
            if lifecycle is not None: c_row.lifecycle_stage = str(lifecycle)
            if owner is not None: c_row.account_owner = str(owner)
            if d_val is not None: c_row.deal_value = float(d_val)
            if last_contact is not None: c_row.last_contact_date = last_contact

        # Support
        sup_dict = raw_customer_data.get("support") or {}
        if not isinstance(sup_dict, dict):
            sup_dict = {}
        tickets = raw_customer_data.get("total_tickets") or sup_dict.get("total_tickets")
        res_time = raw_customer_data.get("avg_resolution_time_hours") or sup_dict.get("avg_resolution_time_hours")
        csat = raw_customer_data.get("last_csat_score") or sup_dict.get("last_csat_score")

        if any(x is not None for x in [tickets, res_time, csat]):
            s_row = db.query(CustomerSupportData).filter(CustomerSupportData.customer_id == customer_id).first()
            if not s_row:
                s_row = CustomerSupportData(customer_id=customer_id, company_id=company_id)
                db.add(s_row)
            else:
                s_row.company_id = company_id
            if tickets is not None: s_row.total_tickets = int(tickets)
            if res_time is not None: s_row.avg_resolution_time_hours = float(res_time)
            if csat is not None: s_row.last_csat_score = int(csat)

        # Payment
        pay_dict = raw_customer_data.get("payment") or {}
        if not isinstance(pay_dict, dict):
            pay_dict = {}
        failed_pays = raw_customer_data.get("failed_payments_count") or pay_dict.get("failed_payments_count")
        downgrades = raw_customer_data.get("plan_downgrades_count") or pay_dict.get("plan_downgrades_count")
        delay_days = raw_customer_data.get("days_since_last_payment_delay") or pay_dict.get("days_since_last_payment_delay")

        if any(x is not None for x in [failed_pays, downgrades, delay_days]):
            p_row = db.query(CustomerPaymentData).filter(CustomerPaymentData.customer_id == customer_id).first()
            if not p_row:
                p_row = CustomerPaymentData(customer_id=customer_id, company_id=company_id)
                db.add(p_row)
            else:
                p_row.company_id = company_id
            if failed_pays is not None: p_row.failed_payments_count = int(failed_pays)
            if downgrades is not None: p_row.plan_downgrades_count = int(downgrades)
            if delay_days is not None: p_row.days_since_last_payment_delay = int(delay_days)

        db.commit()

        # 2. Save Prediction Log
        db_prediction = Prediction(
            probability=prob,
            prediction=pred_val,
            threshold=threshold,
            customer_id=customer_id,
            company_id=company_id,
            model_version=pred_analysis["model_version"],
            threshold_version=pred_analysis["threshold_version"]
        )
        db.add(db_prediction)
        db.commit()
        db.refresh(db_prediction)

        # 3. Next Best Action Evaluation
        ret_service = RetentionService(db_session=db)
        nba_result = ret_service.analyze_retention(
            customer_data=pred_input,
            churn_probability=prob,
            customer_value=econ_value
        )

        rec = nba_result["recommended_action"]
        rec_name = rec["name"] if rec else "NO_ACTION"
        rec_cost = rec["cost"] if rec else 0.0
        rec_uplift = rec["predicted_uplift"] if rec else 0.0

        db_decision = RetentionDecision(
            customer_id=customer_id,
            prediction_id=db_prediction.id,
            company_id=company_id,
            customer_value=econ_value,
            intervention_cost=rec_cost,
            expected_effectiveness=rec_uplift,
            expected_retention_value=nba_result["expected_retention_value"],
            expected_net_value=nba_result["expected_net_value"],
            roi=nba_result["roi"],
            priority=nba_result["priority"],
            recommended_action=rec_name,
            decision=nba_result["decision"],
            workflow_status="REVIEW_REQUIRED"
        )
        db.add(db_decision)
        db.commit()

        # Log prediction latency
        latency = time.time() - start
        try:
            logger = PredictionLogger()
            logger.log_prediction(probability=prob, prediction=pred_val, latency=latency)
            logger.close()
        except Exception:
            pass

        # 4. Intervention Recommendation Layer (Rule Engine based on SHAP + Risk)
        shap_explanation = pred_analysis.get("explanation", {})
        risk_badge = pred_analysis.get("risk_segment", "MEDIUM")
        intervention_action = default_intervention_engine.recommend(
            shap_values=shap_explanation,
            risk_badge=risk_badge,
            extra_context=pred_input
        )

        # 5. Automated High-Risk Alerting (Slack Webhook / Console Fallback)
        top_driver_name = "Unknown"
        top_risk_factors = shap_explanation.get("top_risk_factors", [])
        if top_risk_factors and isinstance(top_risk_factors, list):
            top_driver_name = top_risk_factors[0].get("feature", "Unknown")

        trigger_alert_if_high_risk(
            customer_id=customer_id,
            probability=prob,
            top_driver=top_driver_name,
            recommended_action=intervention_action,
            risk_badge=risk_badge,
            background_tasks=background_tasks
        )

        return {
            "customer_id": customer_id,
            "prediction_id": db_prediction.id,
            "risk": {
                "churn_probability": prob,
                "risk_level": pred_analysis["risk_segment"],
                "risk_badge": pred_analysis["risk_segment"],
                "threshold": threshold
            },
            "explanation": pred_analysis["explanation"],
            "shap_values": pred_analysis["explanation"],
            "economics": pred_analysis["economic_value"],
            "recommendation": {
                "id": rec.get("id"),
                "name": rec_name,
                "cost": rec_cost,
                "predicted_uplift": rec_uplift,
                "expected_incremental_value": nba_result["expected_retention_value"],
                "expected_net_value": nba_result["expected_net_value"],
                "roi": nba_result["roi"]
            },
            "alternatives": nba_result.get("alternatives", []),
            "decision": {
                "status": "REVIEW_REQUIRED",
                "priority": nba_result["priority"],
                "decision": nba_result["decision"],
                "why_recommended": nba_result.get("why_recommended", []),
                "why_not_others": nba_result.get("why_not_others", [])
            },
            "model_version": pred_analysis["model_version"],
            "uplift_model_version": "uplift-tlearner-v1.0",
            # Intervention recommendation & backward compatibility aliases
            "prediction": pred_val,
            "probability": prob,
            "threshold": threshold,
            "customer_value": econ_value,
            "retention_priority": nba_result["priority"],
            "recommended_action": intervention_action,
            "next_best_action": rec,
            "expected_retention_value": nba_result["expected_retention_value"],
            "expected_net_value": nba_result["expected_net_value"],
            "roi": nba_result["roi"]
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail={
                "error": "PREDICTION_PIPELINE_FAILED",
                "message": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
        )

@router.get("/v1/predictions/{prediction_id}")
def get_prediction(
    prediction_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    pred = db.query(Prediction).filter(
        Prediction.id == prediction_id,
        Prediction.company_id == current_user.company_id
    ).first()
    if not pred:
        raise HTTPException(status_code=404, detail="Prediction not found.")
    
    decision = db.query(RetentionDecision).filter(RetentionDecision.prediction_id == pred.id).first()
    
    return {
        "prediction_id": pred.id,
        "customer_id": pred.customer_id,
        "churn_probability": pred.probability,
        "prediction": pred.prediction,
        "threshold": pred.threshold,
        "model_version": pred.model_version,
        "created_at": pred.created_at.isoformat() if pred.created_at else None,
        "decision": {
            "id": decision.id if decision else None,
            "recommended_action": decision.recommended_action if decision else None,
            "expected_net_value": decision.expected_net_value if decision else 0.0,
            "roi": decision.roi if decision else 0.0,
            "status": decision.workflow_status if decision else None
        }
    }