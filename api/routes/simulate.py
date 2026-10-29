import logging
import pandas as pd
from typing import Dict, Any

from fastapi import APIRouter, HTTPException, Depends

from api.dependencies import predictor
from api.schemas import SimulateRequest, SimulateResponse, CustomerRequest
from churnguard.database.models import User
from churnguard.auth.dependencies import get_current_active_user

logger = logging.getLogger(__name__)

router = APIRouter()

def _extract_customer_dict(customer: CustomerRequest) -> Dict[str, Any]:
    raw = customer.model_dump() if hasattr(customer, 'model_dump') else customer.dict()
    pred_input = {k: v for k, v in raw.items() if k not in ["behavioral", "crm", "support", "payment"]}
    for domain in ["behavioral", "crm", "support", "payment"]:
        domain_dict = raw.get(domain)
        if isinstance(domain_dict, dict):
            for dk, dv in domain_dict.items():
                if dv is not None:
                    pred_input[dk] = dv
    return pred_input

def _get_risk_badge(prob: float) -> str:
    if prob >= 0.75:
        return "CRITICAL"
    elif prob >= 0.45:
        return "HIGH"
    elif prob >= 0.20:
        return "MEDIUM"
    else:
        return "LOW"

@router.post("/simulate", response_model=SimulateResponse)
def simulate_customer_whatif(
    payload: SimulateRequest,
    current_user: User = Depends(get_current_active_user)
) -> SimulateResponse:
    """
    Perform What-If simulation on customer churn risk.
    Accepts baseline customer features and proposed modifications,
    re-running model inference to compute delta probability, risk badge shifts,
    and impact direction.
    """
    try:
        # 1. Baseline customer prediction
        orig_input = _extract_customer_dict(payload.customer)
        orig_df = pd.DataFrame([orig_input])
        orig_res = predictor.predict(orig_df)
        orig_prob = float(orig_res["probability"])
        orig_badge = _get_risk_badge(orig_prob)

        # 2. Apply modifications to create simulated customer
        sim_input = dict(orig_input)
        applied_mods = {}
        if payload.modifications:
            for k, v in payload.modifications.items():
                if k in ["behavioral", "crm", "support", "payment"] and isinstance(v, dict):
                    for sub_k, sub_v in v.items():
                        sim_input[sub_k] = sub_v
                        applied_mods[sub_k] = sub_v
                else:
                    sim_input[k] = v
                    applied_mods[k] = v

        # Re-run prediction on simulated input
        sim_df = pd.DataFrame([sim_input])
        sim_res = predictor.predict(sim_df)
        sim_prob = float(sim_res["probability"])
        sim_badge = _get_risk_badge(sim_prob)

        # 3. Calculate metrics
        delta_prob = round(sim_prob - orig_prob, 4)
        if orig_prob > 1e-6:
            delta_pct = round(((sim_prob - orig_prob) / orig_prob) * 100, 2)
        else:
            delta_pct = 0.0

        if delta_prob < -0.005:
            direction = "REDUCED_RISK"
            summary = f"Risk reduced by {abs(delta_pct):.1f}% ({orig_prob:.1%} → {sim_prob:.1%})"
        elif delta_prob > 0.005:
            direction = "INCREASED_RISK"
            summary = f"Risk increased by {abs(delta_pct):.1f}% ({orig_prob:.1%} → {sim_prob:.1%})"
        else:
            direction = "NO_CHANGE"
            summary = f"Risk virtually unchanged ({orig_prob:.1%} → {sim_prob:.1%})"

        return SimulateResponse(
            original_probability=orig_prob,
            original_risk_badge=orig_badge,
            simulated_probability=sim_prob,
            simulated_risk_badge=sim_badge,
            delta_probability=delta_prob,
            delta_percentage=delta_pct,
            impact_direction=direction,
            modified_features=applied_mods,
            summary=summary
        )

    except Exception as e:
        logger.error(f"Error during what-if simulation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Simulation error: {str(e)}")
