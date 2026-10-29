from typing import Dict, Any, List, Optional
from datetime import datetime
from churnguard.retention.next_best_action import NextBestActionEngine
from churnguard.database.models import Customer, Prediction, RetentionDecision, ManagerLog, InterventionOutcome

class RetentionService:
    """
    Service layer for Next Best Action decisions, manager approvals, overrides, and audit logging.
    """
    def __init__(self, db_session=None):
        self.db = db_session
        self.nba_engine = NextBestActionEngine(db_session=db_session)

    def analyze_retention(self, customer_data: Dict[str, Any], churn_probability: float, customer_value: float) -> Dict[str, Any]:
        """
        Run Next Best Action engine and return comprehensive decision intelligence breakdown.
        """
        nba_result = self.nba_engine.select_next_best_action(
            churn_probability=churn_probability,
            customer_value=customer_value,
            customer_data=customer_data
        )
        return nba_result
    def _find_or_create_decision(self, decision_id: Any, company_id: Optional[int] = None) -> RetentionDecision:
        decision = None
        if isinstance(decision_id, int):
            query = self.db.query(RetentionDecision).filter(RetentionDecision.id == decision_id)
            if company_id is not None:
                query = query.filter(RetentionDecision.company_id == company_id)
            decision = query.first()

        if not decision:
            query = self.db.query(RetentionDecision).filter(RetentionDecision.customer_id == str(decision_id))
            if company_id is not None:
                query = query.filter(RetentionDecision.company_id == company_id)
            decision = query.first()

        if not decision:
            # Check if customer exists within tenant
            cust_query = self.db.query(Customer).filter(Customer.customer_id == str(decision_id))
            if company_id is not None:
                cust_query = cust_query.filter(Customer.company_id == company_id)
            cust = cust_query.first()
            if cust:
                decision = RetentionDecision(
                    customer_id=cust.customer_id,
                    company_id=cust.company_id or company_id,
                    customer_value=(cust.MonthlyCharges or 70.0) * 24.0,
                    recommended_action="15% Retention Discount",
                    workflow_status="REVIEW_REQUIRED"
                )
                self.db.add(decision)
                self.db.commit()
                self.db.refresh(decision)

        if not decision:
            # Check if it existed under another company to provide explicit permission error
            if isinstance(decision_id, int):
                other_tenant_dec = self.db.query(RetentionDecision).filter(RetentionDecision.id == decision_id).first()
                if other_tenant_dec and company_id is not None and other_tenant_dec.company_id != company_id:
                    raise PermissionError("Access denied: Retention decision does not belong to your organization.")

            raise ValueError(f"Retention decision #{decision_id} not found.")

        if company_id is not None and decision.company_id != company_id:
            raise PermissionError("Access denied: Retention decision does not belong to your organization.")

        return decision

    def approve_decision(
        self,
        decision_id: int,
        user_name: str = "Retention Manager",
        company_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Approve AI recommended retention action for a decision.
        """
        if not self.db:
            return {"status": "SUCCESS", "message": "Decision approved (mock mode)."}

        decision = self._find_or_create_decision(decision_id, company_id=company_id)
        decision.workflow_status = "APPROVED"

        # Log Manager Audit
        log = ManagerLog(
            user_name=user_name,
            customer_id=decision.customer_id,
            company_id=decision.company_id,
            prediction_id=decision.prediction_id,
            action_type="APPROVE",
            ai_recommendation=decision.recommended_action,
            selected_intervention=decision.recommended_action,
            override_reason=None
        )
        self.db.add(log)
        self.db.commit()

        return {
            "status": "APPROVED",
            "decision_id": decision.id,
            "customer_id": decision.customer_id,
            "action": decision.recommended_action
        }

    def reject_decision(
        self,
        decision_id: int,
        user_name: str = "Retention Manager",
        reason: Optional[str] = None,
        company_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Reject retention action for a decision.
        """
        if not self.db:
            return {"status": "SUCCESS", "message": "Decision rejected (mock mode)."}

        decision = self._find_or_create_decision(decision_id, company_id=company_id)
        decision.workflow_status = "REJECTED"

        log = ManagerLog(
            user_name=user_name,
            customer_id=decision.customer_id,
            company_id=decision.company_id,
            prediction_id=decision.prediction_id,
            action_type="REJECT",
            ai_recommendation=decision.recommended_action,
            selected_intervention="NO_ACTION",
            override_reason=reason or "Manager rejected recommendation."
        )
        self.db.add(log)
        self.db.commit()

        return {
            "status": "REJECTED",
            "decision_id": decision.id,
            "customer_id": decision.customer_id
        }

    def override_decision(
        self,
        decision_id: int,
        new_intervention_name: str,
        override_reason: str,
        user_name: str = "Retention Manager",
        company_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Override AI recommendation with manager selected alternative intervention.
        Mandatory override_reason required!
        """
        if not override_reason or len(override_reason.strip()) < 5:
            raise ValueError("A valid override reason (minimum 5 characters) is required when overriding AI recommendations.")

        if not self.db:
            return {"status": "SUCCESS", "message": "Decision overridden (mock mode)."}

        decision = self._find_or_create_decision(decision_id, company_id=company_id)

        old_rec = decision.recommended_action
        decision.workflow_status = "OVERRIDDEN"
        decision.recommended_action = new_intervention_name
        decision.override_reason = override_reason

        log = ManagerLog(
            user_name=user_name,
            customer_id=decision.customer_id,
            company_id=decision.company_id,
            prediction_id=decision.prediction_id,
            action_type="OVERRIDE",
            ai_recommendation=old_rec,
            selected_intervention=new_intervention_name,
            override_reason=override_reason
        )
        self.db.add(log)
        self.db.commit()

        return {
            "status": "OVERRIDDEN",
            "decision_id": decision.id,
            "customer_id": decision.customer_id,
            "original_recommendation": old_rec,
            "new_action": new_intervention_name,
            "override_reason": override_reason
        }

