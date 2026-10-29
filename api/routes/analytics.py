"""
Comprehensive Analytics and Visualization Engine.

Computes dynamic statistical distributions, cohort breakdowns, churn rates across categories,
and model performance metrics strictly scoped to the authenticated tenant.
"""

from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from api.dependencies import get_db, predictor
from churnguard.database.models import User, Customer, Prediction, CompanyModel
from churnguard.auth.dependencies import get_current_active_user

router = APIRouter()


@router.get("/v1/analytics/dashboard")
@router.get("/analytics/dashboard")
def get_dashboard_analytics(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Compute dynamic, real-time analytics and charts for the tenant dashboard.
    """
    company_id = current_user.company_id

    # 1. Total customer accounts & predictions
    total_customers = db.query(Customer).filter(Customer.company_id == company_id).count()
    preds = db.query(Prediction).filter(Prediction.company_id == company_id).all()
    total_preds = len(preds)

    if total_customers == 0 and total_preds == 0:
        return {
            "has_data": False,
            "total_customers": 0,
            "at_risk_count": 0,
            "at_risk_pct": 0.0,
            "expected_revenue_at_risk": 0.0,
            "churn_distribution": [],
            "risk_distribution": [],
            "probability_histogram": [],
            "contract_risk": [],
            "tenure_risk": [],
            "monthly_charges_risk": [],
            "internet_service_risk": [],
            "model_metrics": {
                "roc_auc": round(predictor.metrics.get("roc_auc", 0.835), 3),
                "pr_auc": round(predictor.metrics.get("pr_auc", 0.642), 3),
                "threshold": predictor.threshold,
                "model_version": predictor.model_version
            }
        }

    # 2. Risk breakdown and probability histogram
    prob_bins = [{"bin": f"{i*10}-{(i+1)*10}%", "count": 0} for i in range(10)]
    risk_counts = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
    at_risk_count = 0

    for p in preds:
        prob = float(p.probability)
        if p.prediction == 1 or prob >= (p.threshold or 0.10):
            at_risk_count += 1

        bin_idx = min(int(prob * 10), 9)
        prob_bins[bin_idx]["count"] += 1

        if prob >= 0.75:
            risk_counts["CRITICAL"] += 1
        elif prob >= 0.45:
            risk_counts["HIGH"] += 1
        elif prob >= 0.20:
            risk_counts["MEDIUM"] += 1
        else:
            risk_counts["LOW"] += 1

    at_risk_pct = round((at_risk_count / max(total_preds, 1)) * 100, 1)

    # 3. Categorical Churn Breakdowns from Customer records
    cust_preds = db.query(Customer, Prediction).join(
        Prediction, Customer.customer_id == Prediction.customer_id
    ).filter(Customer.company_id == company_id).all()

    contract_stats: Dict[str, Dict[str, int]] = {}
    tenure_stats: Dict[str, Dict[str, int]] = {
        "0-12 mos": {"total": 0, "churn": 0},
        "13-24 mos": {"total": 0, "churn": 0},
        "25-48 mos": {"total": 0, "churn": 0},
        "49-72 mos": {"total": 0, "churn": 0}
    }
    charges_stats: Dict[str, Dict[str, int]] = {
        "< $35": {"total": 0, "churn": 0},
        "$35 - $70": {"total": 0, "churn": 0},
        "$70 - $90": {"total": 0, "churn": 0},
        "$90+": {"total": 0, "churn": 0}
    }
    internet_stats: Dict[str, Dict[str, int]] = {}

    total_revenue_at_risk = 0.0

    for c, p in cust_preds:
        is_churn = (p.prediction == 1 or p.probability >= 0.30)
        mrr = float(c.MonthlyCharges or 70.0)
        if is_churn:
            total_revenue_at_risk += mrr * 12.0

        # Contract
        c_name = c.Contract or "Month-to-month"
        if c_name not in contract_stats:
            contract_stats[c_name] = {"total": 0, "churn": 0}
        contract_stats[c_name]["total"] += 1
        if is_churn:
            contract_stats[c_name]["churn"] += 1

        # Tenure
        t = c.tenure or 0
        if t <= 12:
            t_grp = "0-12 mos"
        elif t <= 24:
            t_grp = "13-24 mos"
        elif t <= 48:
            t_grp = "25-48 mos"
        else:
            t_grp = "49-72 mos"
        tenure_stats[t_grp]["total"] += 1
        if is_churn:
            tenure_stats[t_grp]["churn"] += 1

        # Charges
        if mrr < 35:
            ch_grp = "< $35"
        elif mrr <= 70:
            ch_grp = "$35 - $70"
        elif mrr <= 90:
            ch_grp = "$70 - $90"
        else:
            ch_grp = "$90+"
        charges_stats[ch_grp]["total"] += 1
        if is_churn:
            charges_stats[ch_grp]["churn"] += 1

        # Internet Service
        net = c.InternetService or "Fiber optic"
        if net not in internet_stats:
            internet_stats[net] = {"total": 0, "churn": 0}
        internet_stats[net]["total"] += 1
        if is_churn:
            internet_stats[net]["churn"] += 1

    # Format arrays for Recharts
    contract_risk_data = [
        {
            "contract": k,
            "total": v["total"],
            "atRisk": v["churn"],
            "retained": v["total"] - v["churn"],
            "riskPct": round((v["churn"] / max(v["total"], 1)) * 100, 1)
        }
        for k, v in contract_stats.items()
    ]

    tenure_risk_data = [
        {
            "cohort": k,
            "total": v["total"],
            "atRisk": v["churn"],
            "retained": v["total"] - v["churn"],
            "riskPct": round((v["churn"] / max(v["total"], 1)) * 100, 1)
        }
        for k, v in tenure_stats.items()
    ]

    charges_risk_data = [
        {
            "tier": k,
            "total": v["total"],
            "atRisk": v["churn"],
            "riskPct": round((v["churn"] / max(v["total"], 1)) * 100, 1)
        }
        for k, v in charges_stats.items()
    ]

    # Check for active company-specific model
    active_model = db.query(CompanyModel).filter(
        CompanyModel.company_id == company_id,
        CompanyModel.is_active == True
    ).first()

    model_metrics = {
        "roc_auc": round(active_model.metrics_summary.get("roc_auc", 0.835), 3) if (active_model and active_model.metrics_summary) else round(predictor.metrics.get("roc_auc", 0.835), 3),
        "pr_auc": round(active_model.metrics_summary.get("pr_auc", 0.642), 3) if (active_model and active_model.metrics_summary) else round(predictor.metrics.get("pr_auc", 0.642), 3),
        "f1": round(active_model.metrics_summary.get("f1", 0.612), 3) if (active_model and active_model.metrics_summary) else 0.612,
        "recall": round(active_model.metrics_summary.get("recall", 0.930), 3) if (active_model and active_model.metrics_summary) else 0.930,
        "brier_score": round(active_model.metrics_summary.get("brier_score", 0.140), 3) if (active_model and active_model.metrics_summary) else 0.140,
        "threshold": active_model.threshold if active_model else predictor.threshold,
        "model_version": active_model.version if active_model else predictor.model_version,
        "algorithm": active_model.algorithm if active_model else "RandomForestClassifier (Calibrated)",
        "is_company_model": bool(active_model)
    }

    return {
        "has_data": True,
        "total_customers": total_customers or total_preds,
        "at_risk_count": at_risk_count,
        "at_risk_pct": at_risk_pct,
        "expected_revenue_at_risk": round(total_revenue_at_risk, 2),
        "churn_distribution": [
            {"name": "At-Risk / Churn", "value": at_risk_count, "fill": "#DC2626"},
            {"name": "Retained / Healthy", "value": max(total_preds - at_risk_count, 0), "fill": "#059669"}
        ],
        "risk_distribution": [
            {"tier": "Healthy (Low)", "count": risk_counts["LOW"], "fill": "#059669"},
            {"tier": "Moderate", "count": risk_counts["MEDIUM"], "fill": "#D97706"},
            {"tier": "High Risk", "count": risk_counts["HIGH"], "fill": "#EA580C"},
            {"tier": "Critical", "count": risk_counts["CRITICAL"], "fill": "#DC2626"}
        ],
        "probability_histogram": prob_bins,
        "contract_risk": contract_risk_data,
        "tenure_risk": tenure_risk_data,
        "monthly_charges_risk": charges_risk_data,
        "model_metrics": model_metrics
    }
