"""
Intervention Recommendation Engine for ChurnGuard.

Provides a clean, extensible, dictionary-based rule engine that maps top SHAP
feature drivers and customer risk levels to targeted retention actions.
"""

from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional, Callable, Union
import re


@dataclass
class InterventionRule:
    """
    Representation of an intervention recommendation rule.
    """
    rule_id: str
    feature_patterns: List[str]
    recommended_action: str
    allowed_risk_levels: Optional[List[str]] = None  # e.g., ["HIGH", "CRITICAL"] or None for any
    min_impact: float = 0.0
    priority: int = 50
    description: str = ""
    custom_condition: Optional[Callable[[Dict[str, Any], str], bool]] = None

    def matches(self, feature_name: str, risk_badge: str, impact: float = 0.0, extra_context: Optional[Dict[str, Any]] = None) -> bool:
        """
        Check whether this rule matches the given feature driver and risk level.
        """
        # 1. Check risk level if restricted
        normalized_risk = (risk_badge or "").strip().upper()
        if self.allowed_risk_levels:
            allowed = [r.strip().upper() for r in self.allowed_risk_levels]
            if normalized_risk not in allowed:
                return False

        # 2. Check impact threshold
        if impact < self.min_impact:
            return False

        # 3. Check custom condition if supplied
        if self.custom_condition:
            ctx = extra_context or {}
            if not self.custom_condition(ctx, normalized_risk):
                return False

        # 4. Check feature pattern matching
        feat_clean = re.sub(r"[^a-z0-9]", "", feature_name.lower())
        for pattern in self.feature_patterns:
            pat_clean = re.sub(r"[^a-z0-9]", "", pattern.lower())
            if pat_clean in feat_clean or feat_clean in pat_clean:
                return True
            # Substring word matching
            pattern_tokens = [t for t in re.split(r"[_\s=\-:]+", pattern.lower()) if t]
            if pattern_tokens and all(token in feature_name.lower() for token in pattern_tokens):
                return True

        return False


class InterventionEngine:
    """
    Extensible, dictionary-based rule engine for determining targeted retention interventions.
    """

    def __init__(self, rules: Optional[Dict[str, InterventionRule]] = None):
        self._rules: Dict[str, InterventionRule] = {}
        if rules:
            for rule in rules.values():
                self.register_rule(rule)
        else:
            self._load_default_rules()

    def register_rule(self, rule: InterventionRule) -> "InterventionEngine":
        """
        Register or override a rule in the engine's rule dictionary.
        """
        self._rules[rule.rule_id] = rule
        return self

    def add_rule(
        self,
        rule_id: str,
        feature_patterns: List[str],
        recommended_action: str,
        allowed_risk_levels: Optional[List[str]] = None,
        priority: int = 50,
        description: str = "",
        min_impact: float = 0.0,
        custom_condition: Optional[Callable[[Dict[str, Any], str], bool]] = None
    ) -> "InterventionEngine":
        """
        Convenience builder to add a rule directly.
        """
        rule = InterventionRule(
            rule_id=rule_id,
            feature_patterns=feature_patterns,
            recommended_action=recommended_action,
            allowed_risk_levels=allowed_risk_levels,
            priority=priority,
            description=description,
            min_impact=min_impact,
            custom_condition=custom_condition
        )
        return self.register_rule(rule)

    def remove_rule(self, rule_id: str) -> Optional[InterventionRule]:
        """
        Remove a rule from the engine by rule_id.
        """
        return self._rules.pop(rule_id, None)

    def get_rule(self, rule_id: str) -> Optional[InterventionRule]:
        """
        Retrieve a registered rule.
        """
        return self._rules.get(rule_id)

    def list_rules(self) -> List[Dict[str, Any]]:
        """
        List metadata for all active rules sorted by priority descending.
        """
        sorted_rules = sorted(self._rules.values(), key=lambda r: r.priority, reverse=True)
        return [
            {
                "rule_id": r.rule_id,
                "feature_patterns": r.feature_patterns,
                "recommended_action": r.recommended_action,
                "allowed_risk_levels": r.allowed_risk_levels,
                "priority": r.priority,
                "description": r.description
            }
            for r in sorted_rules
        ]

    def _load_default_rules(self):
        """
        Initialize the default rule catalogue.
        """
        # Rule 1: Month-to-month contract with High/Critical risk -> Offer annual plan discount
        self.add_rule(
            rule_id="contract_month_to_month_discount",
            feature_patterns=[
                "contract_type=month-to-month",
                "Contract_Month-to-month",
                "Contract=Month-to-month",
                "contract_month_to_month",
                "Month-to-month",
                "contract"
            ],
            recommended_action="Offer annual plan discount",
            allowed_risk_levels=["HIGH", "CRITICAL"],
            priority=100,
            description="Customers on month-to-month contracts at high risk get annual plan discount."
        )

        # Rule 2: High monthly charges with High/Critical risk -> Offer loyalty discount
        self.add_rule(
            rule_id="high_monthly_charges_loyalty",
            feature_patterns=[
                "high monthly_charges",
                "high monthly charges",
                "MonthlyCharges",
                "monthly_charges",
                "monthlycharges",
                "TotalCharges"
            ],
            recommended_action="Offer loyalty discount",
            allowed_risk_levels=["HIGH", "CRITICAL"],
            priority=90,
            description="Customers with high price sensitivity and high charges get loyalty discount."
        )

        # Rule 3: Low login frequency / Inactivity -> Send re-engagement email
        self.add_rule(
            rule_id="low_login_frequency_reengagement",
            feature_patterns=[
                "low login_frequency",
                "low login frequency",
                "login_frequency",
                "loginfrequency",
                "days_since_last_login",
                "inactivity",
                "avg_session_duration_minutes",
                "feature_usage_count"
            ],
            recommended_action="Send re-engagement email",
            allowed_risk_levels=None,  # Applies across risk levels
            priority=80,
            description="Disengaged or inactive users receive automated re-engagement outreach."
        )

        # Rule 4: High support tickets / Support friction -> Escalate to senior CS agent
        self.add_rule(
            rule_id="high_support_tickets_escalation",
            feature_patterns=[
                "high support tickets",
                "high support_tickets",
                "support tickets",
                "total_tickets",
                "support_tickets",
                "avg_resolution_time_hours",
                "TechSupport"
            ],
            recommended_action="Escalate to senior CS agent",
            allowed_risk_levels=None,
            priority=85,
            description="Customers experiencing support issues are routed to a senior CS specialist."
        )

        # Rule 5: Payment friction / Failed payments -> Assist with payment method & flexible billing
        self.add_rule(
            rule_id="payment_friction_assistance",
            feature_patterns=[
                "failed_payments_count",
                "failed_payments",
                "days_since_last_payment_delay",
                "plan_downgrades_count",
                "PaymentMethod",
                "payment"
            ],
            recommended_action="Assist with payment method & flexible billing",
            allowed_risk_levels=None,
            priority=75,
            description="Payment failures or payment friction receive billing concierge assistance."
        )

        # Rule 6: Low CSAT score -> Schedule executive customer check-in
        self.add_rule(
            rule_id="low_csat_outreach",
            feature_patterns=[
                "last_csat_score",
                "csat_score",
                "low csat",
                "csat"
            ],
            recommended_action="Schedule executive customer check-in",
            allowed_risk_levels=None,
            priority=70,
            description="Low CSAT ratings trigger dedicated relationship manager follow-up."
        )

    def extract_top_driver(self, shap_values: Any) -> Dict[str, Any]:
        """
        Parse diverse SHAP representation formats and extract the top risk driver.
        Supports:
        - List of dicts: [{'feature': '...', 'impact': 0.3}, ...]
        - Dict: {'Contract_Month-to-month': 0.25, 'MonthlyCharges': 0.15}
        - Dict with 'top_risk_factors': {'top_risk_factors': [...]}
        - List of tuples: [('Contract_Month-to-month', 0.25)]
        - Single string: 'contract_type=month-to-month'
        """
        if not shap_values:
            return {"feature": "Unknown", "impact": 0.0}

        # Single string
        if isinstance(shap_values, str):
            return {"feature": shap_values, "impact": 1.0}

        # Nested dict from prediction service explanation
        if isinstance(shap_values, dict):
            if "top_risk_factors" in shap_values and isinstance(shap_values["top_risk_factors"], list):
                if len(shap_values["top_risk_factors"]) > 0:
                    top_item = shap_values["top_risk_factors"][0]
                    return {
                        "feature": str(top_item.get("feature", top_item.get("Feature", "Unknown"))),
                        "impact": float(top_item.get("impact", top_item.get("Impact", top_item.get("shap", 0.0))))
                    }
                return {"feature": "Unknown", "impact": 0.0}

            # Standard feature -> value dictionary
            items = []
            for k, v in shap_values.items():
                if isinstance(v, (int, float)):
                    items.append((str(k), float(v)))
            if items:
                items.sort(key=lambda x: x[1], reverse=True)
                return {"feature": items[0][0], "impact": items[0][1]}

        # List of items
        if isinstance(shap_values, list) and len(shap_values) > 0:
            first_item = shap_values[0]
            if isinstance(first_item, dict):
                # Sort if multiple dict items present
                sorted_items = sorted(
                    shap_values,
                    key=lambda x: float(x.get("impact", x.get("Impact", x.get("shap", x.get("value", 0.0))))),
                    reverse=True
                )
                top = sorted_items[0]
                return {
                    "feature": str(top.get("feature", top.get("Feature", top.get("name", "Unknown")))),
                    "impact": float(top.get("impact", top.get("Impact", top.get("shap", top.get("value", 0.0)))))
                }
            elif isinstance(first_item, (tuple, list)) and len(first_item) >= 2:
                sorted_items = sorted(shap_values, key=lambda x: float(x[1]), reverse=True)
                return {"feature": str(sorted_items[0][0]), "impact": float(sorted_items[0][1])}
            elif isinstance(first_item, str):
                return {"feature": first_item, "impact": 1.0}

        return {"feature": "Unknown", "impact": 0.0}

    def evaluate(
        self,
        shap_values: Any,
        risk_badge: str,
        extra_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Evaluate SHAP drivers + risk badge against registered rules.
        Returns a rich recommendation dictionary including matched rule details.
        """
        top_driver = self.extract_top_driver(shap_values)
        feature_name = top_driver.get("feature", "Unknown")
        impact = float(top_driver.get("impact", 0.0))
        normalized_risk = (risk_badge or "").strip().upper()

        # Sort registered rules by priority descending
        sorted_rules = sorted(self._rules.values(), key=lambda r: r.priority, reverse=True)

        for rule in sorted_rules:
            if rule.matches(feature_name=feature_name, risk_badge=normalized_risk, impact=impact, extra_context=extra_context):
                return {
                    "recommended_action": rule.recommended_action,
                    "rule_id": rule.rule_id,
                    "top_driver": feature_name,
                    "impact": impact,
                    "risk_badge": normalized_risk,
                    "description": rule.description
                }

        # Fallback recommendations if no specific rule matched
        if normalized_risk in ["HIGH", "CRITICAL"]:
            fallback_action = "Initiate proactive retention call"
            rule_id = "fallback_high_risk"
        elif normalized_risk in ["MEDIUM"]:
            fallback_action = "Schedule relationship follow-up"
            rule_id = "fallback_medium_risk"
        else:
            fallback_action = "No action needed - standard monitoring"
            rule_id = "fallback_low_risk"

        return {
            "recommended_action": fallback_action,
            "rule_id": rule_id,
            "top_driver": feature_name,
            "impact": impact,
            "risk_badge": normalized_risk,
            "description": "Default baseline action based on risk level."
        }

    def recommend(
        self,
        shap_values: Any,
        risk_badge: str,
        extra_context: Optional[Dict[str, Any]] = None,
        return_details: bool = False
    ) -> Union[str, Dict[str, Any]]:
        """
        Recommend an intervention action.
        Returns the action string by default, or full details dict if return_details is True.
        """
        result = self.evaluate(shap_values=shap_values, risk_badge=risk_badge, extra_context=extra_context)
        if return_details:
            return result
        return result["recommended_action"]


# Global default instance
default_intervention_engine = InterventionEngine()


def get_recommended_action(
    shap_values: Any,
    risk_badge: str,
    extra_context: Optional[Dict[str, Any]] = None
) -> str:
    """
    Convenience function to get the recommended action using the default engine.
    """
    return default_intervention_engine.recommend(
        shap_values=shap_values,
        risk_badge=risk_badge,
        extra_context=extra_context,
        return_details=False
    )
