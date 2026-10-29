from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

class RetentionPolicyEngine:
    """
    Business Policy and Constraint Engine for Customer Retention.
    Enforces eligibility, budget constraints, minimum ROI thresholds, contact fatigue rules,
    and business limits. Decouples business policies from machine learning models.
    """
    def __init__(
        self,
        minimum_roi: float = 0.20,             # Minimum 20% ROI required
        minimum_expected_net_value: float = 100.0, # Minimum net gain of ₹100 required
        max_intervention_cost: float = 10000.0,
        cooldown_days: int = 30
    ):
        self.minimum_roi = minimum_roi
        self.minimum_expected_net_value = minimum_expected_net_value
        self.max_intervention_cost = max_intervention_cost
        self.cooldown_days = cooldown_days

    def check_eligibility(
        self,
        intervention: Dict[str, Any],
        customer_data: Dict[str, Any],
        customer_value: float,
        last_contacted_at: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Check if an intervention is eligible for a customer based on business rules.
        """
        name = str(intervention.get("name", "")).lower()
        cost = float(intervention.get("cost", 0.0))
        
        contract = str(customer_data.get("Contract", "")).lower()
        tech_support = str(customer_data.get("TechSupport", "")).lower()
        internet = str(customer_data.get("InternetService", "")).lower()
        tenure = int(customer_data.get("tenure", 0))
        monthly = float(customer_data.get("MonthlyCharges", 0.0))

        # Check contact fatigue / cooldown
        if last_contacted_at:
            days_since = (datetime.utcnow() - last_contacted_at).days
            if days_since < self.cooldown_days:
                return {
                    "eligible": False,
                    "reason": f"Customer in contact cooldown period ({days_since}/{self.cooldown_days} days)."
                }

        # Check cost threshold
        if cost > self.max_intervention_cost:
            return {
                "eligible": False,
                "reason": f"Intervention cost (₹{cost:,.2f}) exceeds maximum allowed threshold (₹{self.max_intervention_cost:,.2f})."
            }

        # Specific intervention eligibility policies
        if "discount" in name or "contract" in name:
            if "two" in contract:
                return {
                    "eligible": False,
                    "reason": "Discount intervention not eligible for 2-year contract customers with existing fixed pricing."
                }

        if "technical" in name or "support" in name:
            if tech_support == "no internet service":
                return {
                    "eligible": False,
                    "reason": "Technical support not eligible for customers without internet service."
                }

        if "loyalty" in name or "reward" in name:
            if tenure < 6:
                return {
                    "eligible": False,
                    "reason": f"Loyalty reward requires minimum tenure of 6 months (current tenure: {tenure} months)."
                }

        if "priority" in name or "vip" in name:
            if customer_value < 5000:
                return {
                    "eligible": False,
                    "reason": f"Priority support restricted to customers with economic value >= ₹5,000 (current value: ₹{customer_value:,.2f})."
                }

        return {"eligible": True, "reason": "Eligible for intervention."}

    def validate_business_constraints(
        self,
        expected_net_value: float,
        roi: float,
        intervention_cost: float,
        remaining_budget: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Validate economics against financial policies (ROI, net value, campaign budget).
        """
        if remaining_budget is not None and intervention_cost > remaining_budget:
            return {
                "valid": False,
                "reason": f"Intervention cost (₹{intervention_cost:,.2f}) exceeds remaining campaign budget (₹{remaining_budget:,.2f})."
            }

        if expected_net_value < self.minimum_expected_net_value:
            return {
                "valid": False,
                "reason": f"Expected net value (₹{expected_net_value:,.2f}) is below minimum threshold (₹{self.minimum_expected_net_value:,.2f})."
            }

        if roi < self.minimum_roi:
            return {
                "valid": False,
                "reason": f"Expected ROI ({roi*100:.1f}%) is below minimum target ROI ({self.minimum_roi*100:.1f}%)."
            }

        return {"valid": True, "reason": "Passed financial constraints."}
