from typing import Dict, Any, Optional

class ValueEstimator:
    """
    Estimates Customer Economic Value based on customer charges, contract type,
    gross margin, and expected remaining lifetime.
    
    Formula:
      Estimated Economic Value = Monthly Charges * Expected Remaining Lifetime (Months) * Gross Margin
    """
    def __init__(self, db_session=None):
        self.db = db_session

    def estimate_value(
        self,
        monthly_charges: float,
        contract: str,
        tenure: int = 0,
        custom_value: Optional[float] = None,
        gross_margin: Optional[float] = None,
        expected_lifetime: Optional[int] = None
    ) -> float:
        """
        Calculate total estimated customer economic value.
        """
        details = self.estimate_value_details(
            monthly_charges=monthly_charges,
            contract=contract,
            tenure=tenure,
            custom_value=custom_value,
            gross_margin=gross_margin,
            expected_lifetime=expected_lifetime
        )
        return details["estimated_economic_value"]

    def estimate_value_details(
        self,
        monthly_charges: float,
        contract: str,
        tenure: int = 0,
        custom_value: Optional[float] = None,
        gross_margin: Optional[float] = None,
        expected_lifetime: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Returns full granular breakdown of economic value calculation.
        """
        if custom_value is not None:
            if custom_value < 0:
                raise ValueError("Customer value cannot be negative.")
            return {
                "estimated_economic_value": float(custom_value),
                "monthly_charges": float(monthly_charges),
                "gross_margin": float(gross_margin if gross_margin is not None else 0.65),
                "expected_lifetime_months": int(expected_lifetime if expected_lifetime is not None else 24),
                "is_custom_override": True
            }

        # Check DB settings if available
        settings = None
        if self.db:
            try:
                from churnguard.database.models import BusinessSettings
                settings = self.db.query(BusinessSettings).first()
            except Exception:
                settings = None

        gm = 0.65 if gross_margin is None else gross_margin
        m2m_lifetime = 12
        one_year_lifetime = 24
        two_year_lifetime = 36

        if settings:
            gm = settings.default_gross_margin if gross_margin is None else gross_margin
            m2m_lifetime = getattr(settings, "expected_lifetime_m2m", 12)
            one_year_lifetime = getattr(settings, "expected_lifetime_one_year", 24)
            two_year_lifetime = getattr(settings, "expected_lifetime_two_year", 36)

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

        estimated_val = float(monthly_charges) * lifetime * gm
        return {
            "estimated_economic_value": float(estimated_val),
            "monthly_charges": float(monthly_charges),
            "gross_margin": float(gm),
            "expected_lifetime_months": int(lifetime),
            "is_custom_override": False
        }
