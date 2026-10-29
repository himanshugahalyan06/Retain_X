from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import numpy as np
from churnguard.database.models import Campaign, CampaignAssignment, InterventionOutcome, Customer, RetentionDecision

class CampaignService:
    """
    Service for managing Retention Campaigns, Treatment vs Control experiment allocations, 
    and calculating campaign incremental uplift and ROI.
    """
    def __init__(self, db_session=None):
        self.db = db_session

    def create_campaign(
        self,
        name: str,
        description: Optional[str] = None,
        objective: Optional[str] = None,
        target_segment: Optional[str] = None,
        budget: float = 100000.0,
        treatment_pct: float = 0.50,
        control_pct: float = 0.50,
        company_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Create a new Campaign entity in DRAFT status.
        """
        if not self.db:
            return {"id": 1, "name": name, "status": "DRAFT", "budget": budget}

        campaign = Campaign(
            name=name,
            company_id=company_id,
            description=description,
            objective=objective,
            target_segment=target_segment or "HIGH_RISK_HIGH_VALUE",
            budget=budget,
            spent_budget=0.0,
            treatment_pct=treatment_pct,
            control_pct=control_pct,
            status="DRAFT"
        )
        self.db.add(campaign)
        self.db.commit()

        return {
            "id": campaign.id,
            "name": campaign.name,
            "status": campaign.status,
            "budget": campaign.budget,
            "target_segment": campaign.target_segment
        }

    def launch_campaign(self, campaign_id: int, company_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Activate campaign status to ACTIVE with tenant scoping.
        """
        if not self.db:
            return {"status": "ACTIVE", "campaign_id": campaign_id}

        query = self.db.query(Campaign).filter(Campaign.id == campaign_id)
        if company_id is not None:
            query = query.filter(Campaign.company_id == company_id)

        campaign = query.first()
        if not campaign:
            raise ValueError(f"Campaign #{campaign_id} not found or access denied.")

        campaign.status = "ACTIVE"
        campaign.updated_at = datetime.utcnow()
        self.db.commit()

        return {
            "status": "ACTIVE",
            "campaign_id": campaign.id,
            "name": campaign.name
        }

    def get_campaign_analytics(self, campaign_id: int, company_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Calculate treatment vs control results, incremental retention, incremental saved value, and realized ROI.
        """
        if not self.db:
            # Synthetic demonstration response if DB not available
            return {
                "campaign_id": campaign_id,
                "name": "Demo Campaign",
                "is_simulated": True,
                "data_label": "Simulation / Demonstration Data",
                "target_customers": 1000,
                "treatment_count": 500,
                "control_count": 500,
                "treatment_retention_rate": 0.68,
                "control_retention_rate": 0.50,
                "incremental_retention_pp": 0.18, # +18 percentage points
                "incremental_customers_saved": 90,
                "total_campaign_cost": 100000.0,
                "incremental_value_saved": 720000.0,
                "net_incremental_value": 620000.0,
                "realized_roi": 6.20
            }

        query = self.db.query(Campaign).filter(Campaign.id == campaign_id)
        if company_id is not None:
            query = query.filter(Campaign.company_id == company_id)

        campaign = query.first()
        if not campaign:
            raise ValueError(f"Campaign #{campaign_id} not found or access denied.")


        outcomes = self.db.query(InterventionOutcome).filter(InterventionOutcome.campaign_id == campaign_id).all()
        
        if not outcomes:
            return {
                "campaign_id": campaign.id,
                "name": campaign.name,
                "status": campaign.status,
                "target_customers": 0,
                "treatment_count": 0,
                "control_count": 0,
                "treatment_retention_rate": 0.0,
                "control_retention_rate": 0.0,
                "incremental_retention_pp": 0.0,
                "incremental_customers_saved": 0,
                "total_campaign_cost": 0.0,
                "incremental_value_saved": 0.0,
                "net_incremental_value": 0.0,
                "realized_roi": 0.0,
                "is_simulated": True,
                "data_label": "Simulation / Demonstration Data"
            }

        t_outcomes = [o for o in outcomes if o.assignment_group == "TREATMENT"]
        c_outcomes = [o for o in outcomes if o.assignment_group == "CONTROL"]

        t_count = len(t_outcomes)
        c_count = len(c_outcomes)

        t_retained = sum(1 for o in t_outcomes if o.retained)
        c_retained = sum(1 for o in c_outcomes if o.retained)

        t_rate = (t_retained / t_count) if t_count > 0 else 0.0
        c_rate = (c_retained / c_count) if c_count > 0 else 0.0

        inc_retention_pp = t_rate - c_rate
        inc_customers_saved = int(np.round(t_count * max(0.0, inc_retention_pp)))

        avg_cust_val = (sum(o.customer_value for o in outcomes) / len(outcomes)) if outcomes else 10000.0
        total_cost = sum(o.actual_cost or o.intervention_cost for o in t_outcomes)
        
        inc_value_saved = inc_customers_saved * avg_cust_val
        net_inc_value = inc_value_saved - total_cost
        roi = (net_inc_value / total_cost) if total_cost > 0 else 0.0

        return {
            "campaign_id": campaign.id,
            "name": campaign.name,
            "status": campaign.status,
            "is_simulated": True,
            "data_label": "Simulation / Demonstration Data",
            "target_customers": t_count + c_count,
            "treatment_count": t_count,
            "control_count": c_count,
            "treatment_retention_rate": float(np.round(t_rate, 4)),
            "control_retention_rate": float(np.round(c_rate, 4)),
            "incremental_retention_pp": float(np.round(inc_retention_pp, 4)),
            "incremental_customers_saved": inc_customers_saved,
            "total_campaign_cost": float(np.round(total_cost, 2)),
            "incremental_value_saved": float(np.round(inc_value_saved, 2)),
            "net_incremental_value": float(np.round(net_inc_value, 2)),
            "realized_roi": float(np.round(roi, 4))
        }
