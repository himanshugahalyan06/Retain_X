from churnguard.value.value_estimator import ValueEstimator
from churnguard.retention.next_best_action import NextBestActionEngine
from typing import Dict, Any, List

class RetentionDecisionEngine:
    """
    Coordinates churn prediction, customer value calculation, next-best action selection, 
    and business explanations.
    """
    def __init__(self, db_session=None):
        self.db = db_session
        self.value_estimator = ValueEstimator(db_session)
        self.nba_engine = NextBestActionEngine(db_session)

    def analyze_customer(
        self,
        customer_data: Dict[str, Any],
        churn_probability: float,
        threshold: float,
        custom_value: float = None,
        gross_margin: float = None,
        expected_lifetime: int = None
    ) -> Dict[str, Any]:
        """
        Analyze customer economics, recommend action, calculate ROI, and construct business explanations.
        """
        # Calculate/Estimate Customer Lifetime Value
        monthly_charges = float(customer_data.get("MonthlyCharges", 0.0))
        contract = customer_data.get("Contract", "Month-to-month")
        tenure = int(customer_data.get("tenure", 0))

        estimated_value = self.value_estimator.estimate_value(
            monthly_charges=monthly_charges,
            contract=contract,
            tenure=tenure,
            custom_value=custom_value,
            gross_margin=gross_margin,
            expected_lifetime=expected_lifetime
        )

        # Select next best action
        decision_details = self.nba_engine.select_next_best_action(
            churn_probability=churn_probability,
            customer_value=estimated_value,
            customer_data=customer_data
        )


        # Generate business explanations
        explanation = self.generate_explanation(
            churn_probability=churn_probability,
            customer_value=estimated_value,
            decision_details=decision_details
        )

        # Add customer value formula detail
        from churnguard.database.models import BusinessSettings
        settings = None
        if self.db:
            settings = self.db.query(BusinessSettings).first()
        gm = settings.default_gross_margin if settings else 0.65
        if gross_margin is not None:
            gm = gross_margin

        m2m_lifetime = settings.expected_lifetime_m2m if settings else 12
        one_year_lifetime = settings.expected_lifetime_one_year if settings else 24
        two_year_lifetime = settings.expected_lifetime_two_year if settings else 36
        
        if expected_lifetime is not None:
            lifetime = expected_lifetime
        else:
            contract_lower = str(contract).lower()
            if "two" in contract_lower:
                lifetime = two_year_lifetime
            elif "one" in contract_lower:
                lifetime = one_year_lifetime
            else:
                lifetime = m2m_lifetime

        value_formula = f"₹{monthly_charges:,.2f} Monthly Charge × {lifetime} Months Lifetime × {gm * 100:.0f}% Gross Margin"

        return {
            "customer_value": estimated_value,
            "value_formula": value_formula,
            "retention_priority": decision_details["priority"],
            "recommended_action": decision_details["recommended_action"],
            "expected_retention_value": decision_details["expected_retention_value"],
            "expected_net_value": decision_details["expected_net_value"],
            "roi": decision_details["roi"],
            "decision": decision_details["decision"],
            "business_explanation": explanation
        }

    def generate_explanation(
        self,
        churn_probability: float,
        customer_value: float,
        decision_details: Dict[str, Any]
    ) -> List[str]:
        """
        Produce human-readable business explanation bullets for why the action was recommended.
        """
        explanation = []
        decision = decision_details["decision"]
        priority = decision_details["priority"]
        rec_action = decision_details["recommended_action"]
        
        risk_pct = churn_probability * 100
        explanation.append(f"Customer has a churn probability of {risk_pct:.1f}%.")

        if decision == "INTERVENE":
            eff = rec_action.get("predicted_uplift", rec_action.get("effectiveness", 0.0))
            explanation.append(f"Estimated customer value is ₹{customer_value:,.2f}.")
            explanation.append(f"Recommended intervention '{rec_action['name']}' costs ₹{rec_action['cost']:,.2f} with {eff * 100:.0f}% predicted uplift.")
            explanation.append(
                f"Expected net retention value is positive at ₹{decision_details['expected_net_value']:,.2f} "
                f"(Expected ROI: {decision_details['roi'] * 100:.1f}%)."
            )
            explanation.append(f"Therefore, intervention is financially justified.")
        else:
            explanation.append(f"Estimated customer value is ₹{customer_value:,.2f}.")
            explanation.append("No active interventions produce a positive expected net value.")
            explanation.append("Retention cost exceeds expected financial benefit, advising no intervention.")

        return explanation
