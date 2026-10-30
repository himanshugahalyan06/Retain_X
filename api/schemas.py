from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime

class BehavioralDataSchema(BaseModel):
    login_frequency: Optional[float] = None
    feature_usage_count: Optional[int] = None
    avg_session_duration_minutes: Optional[float] = None
    last_active_date: Optional[datetime] = None
    days_since_last_login: Optional[int] = None

    class Config:
        from_attributes = True

class CRMDataSchema(BaseModel):
    lifecycle_stage: Optional[str] = "active" # onboarding, active, at_risk, churned
    account_owner: Optional[str] = None
    deal_value: Optional[float] = None
    last_contact_date: Optional[datetime] = None

    class Config:
        from_attributes = True

class SupportDataSchema(BaseModel):
    total_tickets: Optional[int] = None
    avg_resolution_time_hours: Optional[float] = None
    last_csat_score: Optional[int] = Field(default=None, ge=1, le=5)

    class Config:
        from_attributes = True

class PaymentDataSchema(BaseModel):
    failed_payments_count: Optional[int] = None
    plan_downgrades_count: Optional[int] = None
    days_since_last_payment_delay: Optional[int] = None

    class Config:
        from_attributes = True

class CustomerRequest(BaseModel):
    """
    Schema for incoming customer prediction requests.
    Supports backward compatibility: existing calls without enriched data work seamlessly.
    """
    gender: str = "Male"
    SeniorCitizen: int = 0
    Partner: str = "No"
    Dependents: str = "No"
    tenure: int = 12
    PhoneService: str = "Yes"
    MultipleLines: str = "No"
    InternetService: str = "Fiber optic"
    OnlineSecurity: str = "No"
    OnlineBackup: str = "No"
    DeviceProtection: str = "No"
    TechSupport: str = "No"
    StreamingTV: str = "Yes"
    StreamingMovies: str = "Yes"
    Contract: str = "Month-to-month"
    PaperlessBilling: str = "Yes"
    PaymentMethod: str = "Electronic check"
    MonthlyCharges: float = 85.0
    TotalCharges: float = 1020.0

    # Economic & Customer ID Overrides
    customer_id: Optional[str] = None
    custom_customer_value: Optional[float] = Field(default=None, ge=0)
    gross_margin: Optional[float] = Field(default=None, ge=0, le=1)
    expected_lifetime: Optional[int] = Field(default=None, ge=0)

    # Optional Enriched Behavioral Data (Flat)
    login_frequency: Optional[float] = None
    feature_usage_count: Optional[int] = None
    avg_session_duration_minutes: Optional[float] = None
    last_active_date: Optional[datetime] = None
    days_since_last_login: Optional[int] = None

    # Optional Enriched CRM Data (Flat)
    lifecycle_stage: Optional[str] = None
    account_owner: Optional[str] = None
    deal_value: Optional[float] = None
    last_contact_date: Optional[datetime] = None

    # Optional Enriched Support Data (Flat)
    total_tickets: Optional[int] = None
    avg_resolution_time_hours: Optional[float] = None
    last_csat_score: Optional[int] = Field(default=None, ge=1, le=5)

    # Optional Enriched Payment Data (Flat)
    failed_payments_count: Optional[int] = None
    plan_downgrades_count: Optional[int] = None
    days_since_last_payment_delay: Optional[int] = None

    # Optional Enriched Data (Nested sub-schemas)
    behavioral: Optional[BehavioralDataSchema] = None
    crm: Optional[CRMDataSchema] = None
    support: Optional[SupportDataSchema] = None
    payment: Optional[PaymentDataSchema] = None


class BusinessSettingsRequest(BaseModel):
    false_positive_cost: float = Field(default=500.0, ge=0)
    false_negative_cost: float = Field(default=5000.0, ge=0)
    default_gross_margin: float = Field(default=0.65, ge=0, le=1)
    expected_lifetime_m2m: int = Field(default=12, ge=1)
    expected_lifetime_one_year: int = Field(default=24, ge=1)
    expected_lifetime_two_year: int = Field(default=36, ge=1)
    min_roi_threshold: float = Field(default=0.20, ge=0)
    min_net_value_threshold: float = Field(default=100.0, ge=0)
    contact_cooldown_days: int = Field(default=30, ge=1)

class InterventionRequest(BaseModel):
    name: str
    description: Optional[str] = None
    cost: float = Field(ge=0)
    expected_effectiveness: float = Field(ge=0, le=1)
    category: Optional[str] = None

class InterventionResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    cost: float
    expected_effectiveness: float
    category: Optional[str] = None
    active: bool

    class Config:
        from_attributes = True

class RecommendedActionSchema(BaseModel):
    id: Optional[int] = None
    name: str
    cost: float
    predicted_uplift: float
    expected_incremental_value: float
    expected_net_value: float
    roi: float

class CandidateActionSchema(BaseModel):
    id: Optional[int] = None
    name: str
    cost: float
    predicted_uplift: float
    expected_incremental_value: float
    expected_net_value: float
    roi: float
    eligible: bool
    rejection_reason: Optional[str] = None
    category: Optional[str] = None

class RiskBreakdown(BaseModel):
    churn_probability: float
    risk_level: str
    risk_badge: Optional[str] = None
    threshold: float

class EconomicsBreakdown(BaseModel):
    estimated_customer_value: float
    monthly_charges: float
    gross_margin: float
    expected_lifetime_months: int

class PredictResponse(BaseModel):
    customer_id: Optional[str] = None
    risk: RiskBreakdown
    explanation: Dict[str, List[Dict[str, Any]]]
    shap_values: Optional[Dict[str, Any]] = None
    economics: EconomicsBreakdown
    recommendation: RecommendedActionSchema
    alternatives: List[CandidateActionSchema]
    decision: Dict[str, Any]
    model_version: str = "churn-rf-v1.3"
    uplift_model_version: str = "uplift-tlearner-v1.0"
    recommended_action: Optional[Any] = None

class ManagerActionRequest(BaseModel):
    user_name: str = "Retention Manager"
    override_reason: Optional[str] = None
    new_intervention_name: Optional[str] = None

class CampaignCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    objective: Optional[str] = None
    target_segment: Optional[str] = "HIGH_RISK_HIGH_VALUE"
    budget: float = Field(default=100000.0, ge=0)
    treatment_pct: float = Field(default=0.50, ge=0, le=1)
    control_pct: float = Field(default=0.50, ge=0, le=1)

class OutcomeRequest(BaseModel):
    customer_id: str
    intervention_id: Optional[int] = None
    prediction_id: int
    campaign_id: Optional[int] = None
    assignment_group: str = "TREATMENT"
    retained: bool
    actual_revenue: Optional[float] = None
    notes: Optional[str] = None

class ErrorResponse(BaseModel):
    error: str
    message: str
    request_id: Optional[str] = None
    timestamp: str

# ----------------------------------------------------
# Multi-Tenancy & Authentication Schemas
# ----------------------------------------------------

class UserSignupRequest(BaseModel):
    email: str
    password: str
    company_name: str
    full_name: Optional[str] = None

class UserLoginRequest(BaseModel):
    email: str
    password: str

class CompanyOut(BaseModel):
    id: int
    name: str
    plan: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class UserOut(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None
    role: str
    company_id: int
    company_name: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    user: UserOut
    company: CompanyOut

class RefreshTokenRequest(BaseModel):
    refresh_token: Optional[str] = None

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class VerifyEmailRequest(BaseModel):
    token: str

class InviteUserRequest(BaseModel):
    email: str
    role: str = "MEMBER" # ADMIN, MANAGER, MEMBER

class AcceptInviteRequest(BaseModel):
    token: str
    password: str
    full_name: Optional[str] = None

class UpdateUserRoleRequest(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None


# ----------------------------------------------------
# What-If Simulation Schemas
# ----------------------------------------------------

class SimulateRequest(BaseModel):
    customer: CustomerRequest
    modifications: Optional[Dict[str, Any]] = None

class SimulateResponse(BaseModel):
    original_probability: float
    original_risk_badge: str
    simulated_probability: float
    simulated_risk_badge: str
    delta_probability: float
    delta_percentage: float
    impact_direction: str
    modified_features: Dict[str, Any]
    summary: str