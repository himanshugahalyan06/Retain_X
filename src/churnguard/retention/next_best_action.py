from typing import List, Dict, Any, Optional
import numpy as np
import pandas as pd
from churnguard.uplift.uplift_model import TwoModelUplift
from churnguard.retention.policy_engine import RetentionPolicyEngine

class NextBestActionEngine:
    """
    Next Best Action (NBA) Engine.
    
    Evaluates candidate interventions using a causal uplift treatment effect framework:
      1. Uplift(t) = P(retained | Treatment=t) - P(retained | Control)
      2. Expected Incremental Value = Customer Economic Value * Uplift(t)
      3. Expected Net Value = Expected Incremental Value - Intervention Cost
      4. Expected ROI = Expected Net Value / Intervention Cost
      
    Selects the optimal intervention subject to business policy constraints and budget rules.
    Always provides candidate alternatives and transparent decision explanations.
    """
    def __init__(self, db_session=None, uplift_model: Optional[TwoModelUplift] = None, policy_engine: Optional[RetentionPolicyEngine] = None):
        self.db = db_session
        self.uplift_model = uplift_model or TwoModelUplift()
        self.policy_engine = policy_engine or RetentionPolicyEngine()

    def get_available_interventions(self) -> List[Dict[str, Any]]:
        """
        Fetch active interventions from DB or default catalog.
        """
        if self.db:
            try:
                from churnguard.database.models import Intervention
                db_interventions = self.db.query(Intervention).filter(Intervention.active == True).all()
                if db_interventions:
                    return [
                        {
                            "id": inter.id,
                            "name": inter.name,
                            "description": inter.description,
                            "cost": inter.cost,
                            "effectiveness": inter.expected_effectiveness,
                            "category": inter.category
                        }
                        for inter in db_interventions
                    ]
            except Exception:
                pass
            
        return [
            {"id": 1, "name": "15% Retention Discount", "cost": 2000.0, "effectiveness": 0.35, "category": "Discount"},
            {"id": 2, "name": "Free Technical Support", "cost": 500.0, "effectiveness": 0.25, "category": "Support"},
            {"id": 3, "name": "Premium Plan Upgrade", "cost": 1000.0, "effectiveness": 0.30, "category": "Upgrade"},
            {"id": 4, "name": "Loyalty Reward", "cost": 800.0, "effectiveness": 0.20, "category": "Loyalty"},
            {"id": 5, "name": "Priority Support", "cost": 1500.0, "effectiveness": 0.40, "category": "Support"}
        ]

    def evaluate_interventions(
        self,
        churn_probability: float,
        customer_value: float,
        customer_data: Optional[Dict[str, Any]] = None,
        remaining_budget: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """
        Evaluate all candidate interventions using Causal Uplift & Economics.
        """
        interventions = self.get_available_interventions()
        customer_data = customer_data or {}
        df_features = pd.DataFrame([customer_data]) if customer_data else pd.DataFrame([{"tenure": 12, "MonthlyCharges": 70.0}])
        
        evaluated_candidates = []

        for inter in interventions:
            inter_id = inter.get("id")
            name = inter["name"]
            cost = float(inter["cost"])
            
            # Step 1: Check Policy Eligibility
            eligibility = self.policy_engine.check_eligibility(inter, customer_data, customer_value)
            if not eligibility["eligible"]:
                evaluated_candidates.append({
                    "id": inter_id,
                    "name": name,
                    "cost": cost,
                    "predicted_uplift": 0.0,
                    "expected_incremental_value": 0.0,
                    "expected_net_value": -cost,
                    "roi": 0.0,
                    "eligible": False,
                    "rejection_reason": eligibility["reason"],
                    "category": inter.get("category", "")
                })
                continue

            # Step 2: Causal Uplift Estimation
            predicted_uplift = self.uplift_model.predict_uplift(df_features, name)
            
            # Step 3: Economic Calculations
            # Incremental retention probability = predicted uplift
            incremental_retention_prob = predicted_uplift
            
            # Expected Incremental Value = Customer Value * Incremental Retention Prob
            expected_inc_val = customer_value * incremental_retention_prob
            
            # Expected Net Value = Expected Incremental Value - Intervention Cost
            expected_net_val = expected_inc_val - cost
            
            # ROI = Expected Net Value / Cost
            roi = (expected_net_val / cost) if cost > 0 else 0.0

            # Step 4: Policy Financial Constraints Check
            constraint_check = self.policy_engine.validate_business_constraints(
                expected_net_value=expected_net_val,
                roi=roi,
                intervention_cost=cost,
                remaining_budget=remaining_budget
            )
            
            is_valid = constraint_check["valid"]
            rejection_reason = None if is_valid else constraint_check["reason"]

            evaluated_candidates.append({
                "id": inter_id,
                "name": name,
                "cost": cost,
                "predicted_uplift": float(predicted_uplift),
                "expected_incremental_value": float(expected_inc_val),
                "expected_net_value": float(expected_net_val),
                "roi": float(roi),
                "eligible": is_valid,
                "rejection_reason": rejection_reason,
                "category": inter.get("category", "")
            })

        return evaluated_candidates

    def select_next_best_action(
        self,
        churn_probability: float,
        customer_value: float,
        customer_data: Optional[Dict[str, Any]] = None,
        remaining_budget: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Select Next Best Action with candidate ranking, alternative options, and NO_ACTION fallback.
        """
        candidates = self.evaluate_interventions(churn_probability, customer_value, customer_data, remaining_budget)
        
        valid_candidates = [c for c in candidates if c["eligible"] and c["expected_net_value"] > 0]
        
        # Sort valid candidates by expected net value descending
        sorted_valid = sorted(valid_candidates, key=lambda x: x["expected_net_value"], reverse=True)
        
        if not sorted_valid:
            top_rejected_reason = "No candidate intervention produced positive expected net value or passed business policy constraints."
            if candidates:
                # Find reason from first candidate
                reasons = [c.get("rejection_reason") for c in candidates if c.get("rejection_reason")]
                if reasons:
                    top_rejected_reason = reasons[0]

            return {
                "decision": "DO_NOT_INTERVENE",
                "recommended_action": {
                    "id": None,
                    "name": "NO_ACTION",
                    "cost": 0.0,
                    "predicted_uplift": 0.0,
                    "expected_incremental_value": 0.0,
                    "expected_net_value": 0.0,
                    "roi": 0.0
                },
                "expected_retention_value": 0.0,
                "expected_net_value": 0.0,
                "roi": 0.0,
                "priority": "DO_NOT_INTERVENE",
                "confidence": "HIGH",
                "why_recommended": [
                    f"Customer churn probability is {churn_probability*100:.1f}%.",
                    top_rejected_reason,
                    "Defaulting to NO_ACTION to preserve retention budget and avoid negative net ROI."
                ],
                "alternatives": candidates
            }

        best = sorted_valid[0]
        alternatives = sorted_valid[1:] + [c for c in candidates if not c["eligible"] or c["expected_net_value"] <= 0]

        # Categorize priority
        net_val = best["expected_net_value"]
        if net_val >= 5000:
            priority = "CRITICAL"
        elif net_val >= 2000:
            priority = "HIGH"
        elif net_val >= 500:
            priority = "MEDIUM"
        else:
            priority = "LOW"

        # Generate transparent calculation explanation
        why_recommended = [
            f"Customer churn probability is {churn_probability*100:.1f}% with estimated economic value of ₹{customer_value:,.2f}.",
            f"Intervention '{best['name']}' has highest predicted causal uplift (+{best['predicted_uplift']*100:.1f}% retention boost).",
            f"Expected incremental saved value (₹{best['expected_incremental_value']:,.2f}) exceeds intervention cost (₹{best['cost']:,.2f}).",
            f"Yields expected net value of ₹{best['expected_net_value']:,.2f} with {best['roi']*100:.1f}% ROI."
        ]

        why_not_others = []
        for alt in alternatives[:3]:
            if not alt.get("eligible"):
                why_not_others.append(f"'{alt['name']}' rejected: {alt.get('rejection_reason', 'Ineligible')}")
            else:
                why_not_others.append(f"'{alt['name']}' rejected: Lower net value (₹{alt['expected_net_value']:,.2f}) than recommended action.")

        return {
            "decision": "INTERVENE",
            "recommended_action": {
                "id": best.get("id"),
                "name": best["name"],
                "cost": best["cost"],
                "predicted_uplift": best["predicted_uplift"],
                "expected_incremental_value": best["expected_incremental_value"],
                "expected_net_value": best["expected_net_value"],
                "roi": best["roi"]
            },
            "expected_retention_value": best["expected_incremental_value"],
            "expected_net_value": best["expected_net_value"],
            "roi": best["roi"],
            "priority": priority,
            "confidence": "MEDIUM" if best["predicted_uplift"] > 0.15 else "LOW",
            "why_recommended": why_recommended,
            "why_not_others": why_not_others,
            "alternatives": alternatives
        }
