from sqlalchemy.orm import DeclarativeBase, relationship
from sqlalchemy import (
    Column,
    Integer,
    Float,
    DateTime,
    String,
    Boolean,
    ForeignKey,
    Text,
    JSON
)
from datetime import datetime

class Base(DeclarativeBase):
    pass

class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False, unique=True, index=True)
    plan = Column(String, default="ENTERPRISE")
    created_at = Column(DateTime, default=datetime.utcnow)

    users = relationship("User", backref="company", cascade="all, delete-orphan")
    customers = relationship("Customer", backref="company")
    predictions = relationship("Prediction", backref="company")
    retention_decisions = relationship("RetentionDecision", backref="company")
    campaigns = relationship("Campaign", backref="company")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    email = Column(String, nullable=False, unique=True, index=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    role = Column(String, default="MEMBER") # ADMIN, MANAGER, MEMBER
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class PredictionLog(Base):
    __tablename__ = "prediction_logs"

    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)
    probability = Column(Float)
    prediction = Column(Integer)
    latency = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)


class BusinessSettings(Base):
    __tablename__ = "business_settings"

    id = Column(Integer, primary_key=True, default=1)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)
    false_positive_cost = Column(Float, default=500.0)
    false_negative_cost = Column(Float, default=5000.0)
    default_gross_margin = Column(Float, default=0.65)
    expected_lifetime_m2m = Column(Integer, default=12)
    expected_lifetime_one_year = Column(Integer, default=24)
    expected_lifetime_two_year = Column(Integer, default=36)
    optimized_threshold = Column(Float, default=0.1)
    min_roi_threshold = Column(Float, default=0.20)
    min_net_value_threshold = Column(Float, default=100.0)
    contact_cooldown_days = Column(Integer, default=30)


class Customer(Base):
    __tablename__ = "customers"

    customer_id = Column(String, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)
    gender = Column(String)
    SeniorCitizen = Column(Integer)
    Partner = Column(String)
    Dependents = Column(String)
    tenure = Column(Integer)
    PhoneService = Column(String)
    MultipleLines = Column(String)
    InternetService = Column(String)
    OnlineSecurity = Column(String)
    OnlineBackup = Column(String)
    DeviceProtection = Column(String)
    TechSupport = Column(String)
    StreamingTV = Column(String)
    StreamingMovies = Column(String)
    Contract = Column(String)
    PaperlessBilling = Column(String)
    PaymentMethod = Column(String)
    MonthlyCharges = Column(Float)
    TotalCharges = Column(Float)
    risk_segment = Column(String, nullable=True) # LOW, MEDIUM, HIGH, CRITICAL
    value_segment = Column(String, nullable=True) # LOW_VALUE, MEDIUM_VALUE, HIGH_VALUE, VIP
    combined_segment = Column(String, nullable=True)
    last_contacted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Intervention(Base):
    __tablename__ = "interventions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String)
    cost = Column(Float, nullable=False)
    expected_effectiveness = Column(Float, nullable=False) # Historical baseline effectiveness
    category = Column(String)
    active = Column(Boolean, default=True)
    cooldown_days = Column(Integer, default=30)
    eligibility_rules = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    status = Column(String, default="DRAFT") # DRAFT, ACTIVE, PAUSED, COMPLETED, CANCELLED
    objective = Column(String, nullable=True)
    target_segment = Column(String, nullable=True)
    budget = Column(Float, default=100000.0)
    spent_budget = Column(Float, default=0.0)
    treatment_pct = Column(Float, default=0.50)
    control_pct = Column(Float, default=0.50)
    start_date = Column(DateTime, default=datetime.utcnow)
    end_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CampaignAssignment(Base):
    __tablename__ = "campaign_assignments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=False, index=True)
    customer_id = Column(String, ForeignKey("customers.customer_id"), nullable=False, index=True)
    assignment_group = Column(String, nullable=False) # TREATMENT, CONTROL
    intervention_id = Column(Integer, ForeignKey("interventions.id"), nullable=True)
    assignment_timestamp = Column(DateTime, default=datetime.utcnow)

    campaign = relationship("Campaign", backref="assignments")
    customer = relationship("Customer", backref="campaign_assignments")


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)
    probability = Column(Float, nullable=False)
    prediction = Column(Integer, nullable=False)
    threshold = Column(Float, nullable=False)
    customer_id = Column(String, ForeignKey("customers.customer_id"), nullable=False, index=True)
    model_version = Column(String, default="churn-rf-v1.3")
    threshold_version = Column(String, default="cost-policy-v2")
    created_at = Column(DateTime, default=datetime.utcnow)

    customer = relationship("Customer", backref="predictions")


class RetentionDecision(Base):
    __tablename__ = "retention_decisions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)
    customer_id = Column(String, ForeignKey("customers.customer_id"), nullable=False, index=True)
    prediction_id = Column(Integer, ForeignKey("predictions.id"), nullable=True, index=True)
    customer_value = Column(Float, nullable=False, default=1000.0)
    intervention_cost = Column(Float, nullable=False, default=50.0)
    expected_effectiveness = Column(Float, nullable=False, default=0.25) # Predicted uplift
    expected_retention_value = Column(Float, nullable=False, default=250.0) # Expected incremental value
    expected_net_value = Column(Float, nullable=False, default=200.0)
    roi = Column(Float, nullable=False, default=4.0)
    priority = Column(String, nullable=False, default="MEDIUM")
    recommended_action = Column(String, nullable=False, default="15% Retention Discount")
    decision = Column(String, nullable=False, default="CONTACT")
    workflow_status = Column(String, default="REVIEW_REQUIRED") # REVIEW_REQUIRED, APPROVED, REJECTED, OVERRIDDEN, EXECUTED
    override_reason = Column(Text, nullable=True)
    assigned_campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    customer = relationship("Customer", backref="retention_decisions")
    prediction = relationship("Prediction", backref="retention_decision")


class ManagerLog(Base):
    __tablename__ = "manager_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)
    user_name = Column(String, default="Retention Manager")
    customer_id = Column(String, ForeignKey("customers.customer_id"), nullable=False)
    prediction_id = Column(Integer, ForeignKey("predictions.id"), nullable=True)
    action_type = Column(String, nullable=False) # APPROVE, REJECT, OVERRIDE
    ai_recommendation = Column(String, nullable=False)
    selected_intervention = Column(String, nullable=False)
    override_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class InterventionOutcome(Base):
    __tablename__ = "intervention_outcomes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)
    customer_id = Column(String, ForeignKey("customers.customer_id"), nullable=False)
    intervention_id = Column(Integer, ForeignKey("interventions.id"), nullable=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=True)
    prediction_id = Column(Integer, ForeignKey("predictions.id"), nullable=False)
    assignment_group = Column(String, default="TREATMENT") # TREATMENT, CONTROL
    predicted_churn_probability = Column(Float, nullable=False)
    predicted_uplift = Column(Float, default=0.0)
    customer_value = Column(Float, nullable=False)
    intervention_cost = Column(Float, nullable=False)
    predicted_effectiveness = Column(Float, nullable=False)
    expected_net_value = Column(Float, nullable=False)
    outcome_window_days = Column(Integer, default=30)
    action_date = Column(DateTime, default=datetime.utcnow)
    outcome_date = Column(DateTime, nullable=True)
    retained = Column(Boolean, nullable=True)
    churned = Column(Boolean, nullable=True)
    actual_revenue = Column(Float, nullable=True)
    actual_cost = Column(Float, nullable=True)
    actual_value_saved = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(String, default="OUTCOME_PENDING") # OUTCOME_PENDING, RETAINED, CHURNED, EVALUATED

    customer = relationship("Customer", backref="intervention_outcomes")
    intervention = relationship("Intervention", backref="outcomes")
    prediction = relationship("Prediction", backref="intervention_outcomes")


class CustomerBehavioralData(Base):
    __tablename__ = "customer_behavioral_data"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)
    customer_id = Column(String, ForeignKey("customers.customer_id"), nullable=False, unique=True, index=True)
    login_frequency = Column(Float, default=0.0) # logins per month / week
    feature_usage_count = Column(Integer, default=0) # core feature actions
    avg_session_duration_minutes = Column(Float, default=0.0)
    last_active_date = Column(DateTime, nullable=True)
    days_since_last_login = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    customer = relationship("Customer", backref="behavioral_data")


class CustomerCRMData(Base):
    __tablename__ = "customer_crm_data"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)
    customer_id = Column(String, ForeignKey("customers.customer_id"), nullable=False, unique=True, index=True)
    lifecycle_stage = Column(String, default="active") # onboarding, active, at_risk, churned
    account_owner = Column(String, nullable=True)
    deal_value = Column(Float, default=0.0)
    last_contact_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    customer = relationship("Customer", backref="crm_data")


class CustomerSupportData(Base):
    __tablename__ = "customer_support_data"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)
    customer_id = Column(String, ForeignKey("customers.customer_id"), nullable=False, unique=True, index=True)
    total_tickets = Column(Integer, default=0)
    avg_resolution_time_hours = Column(Float, default=0.0)
    last_csat_score = Column(Integer, nullable=True) # 1 - 5
    created_at = Column(DateTime, default=datetime.utcnow)

    customer = relationship("Customer", backref="support_data")


class CustomerPaymentData(Base):
    __tablename__ = "customer_payment_data"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)
    customer_id = Column(String, ForeignKey("customers.customer_id"), nullable=False, unique=True, index=True)
    failed_payments_count = Column(Integer, default=0)
    plan_downgrades_count = Column(Integer, default=0)
    days_since_last_payment_delay = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    customer = relationship("Customer", backref="payment_data")


class CompanyDataset(Base):
    __tablename__ = "company_datasets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size_bytes = Column(Integer, default=0)
    row_count = Column(Integer, default=0)
    col_count = Column(Integer, default=0)
    status = Column(String, default="UPLOADED") # UPLOADED, VALIDATING, VALIDATED, FAILED
    target_column = Column(String, nullable=True)
    positive_class = Column(String, nullable=True)
    id_column = Column(String, nullable=True)
    schema_json = Column(JSON, nullable=True)
    profile_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    company = relationship("Company", backref="datasets")


class CompanyTrainingJob(Base):
    __tablename__ = "company_training_jobs"

    id = Column(String, primary_key=True) # UUID string
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    dataset_id = Column(Integer, ForeignKey("company_datasets.id"), nullable=False)
    model_id = Column(Integer, nullable=True)
    status = Column(String, default="QUEUED") # QUEUED, RUNNING, COMPLETED, FAILED, CANCELLED
    progress = Column(Integer, default=0) # 0 to 100
    stage = Column(String, default="Queued")
    target_column = Column(String, nullable=False)
    positive_class = Column(String, default="1")
    algorithms_evaluated = Column(JSON, nullable=True)
    best_algorithm = Column(String, nullable=True)
    metrics_json = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    company = relationship("Company", backref="training_jobs")
    dataset = relationship("CompanyDataset", backref="training_jobs")


class CompanyModel(Base):
    __tablename__ = "company_models"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    dataset_id = Column(Integer, ForeignKey("company_datasets.id"), nullable=True)
    job_id = Column(String, nullable=True)
    training_job_id = Column(String, nullable=True)
    name = Column(String, nullable=False)
    version = Column(String, default="v1.0.0")
    algorithm = Column(String, nullable=False)
    artifact_path = Column(String, nullable=False)
    threshold = Column(Float, default=0.50)
    is_active = Column(Boolean, default=False)
    feature_schema = Column(JSON, nullable=True)
    metrics_summary = Column(JSON, nullable=True)
    evaluation_charts_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    @property
    def test_metrics(self):
        return self.metrics_summary

    @property
    def evaluation_curves(self):
        return self.evaluation_charts_json

    @property
    def feature_importance(self):
        if self.evaluation_charts_json and isinstance(self.evaluation_charts_json, dict):
            return self.evaluation_charts_json.get("feature_importance") or self.evaluation_charts_json.get("feature_importances", [])
        return []

    company = relationship("Company", backref="models")
    dataset = relationship("CompanyDataset", backref="models")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    token_hash = Column(String, nullable=False, unique=True, index=True)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", backref="password_reset_tokens")


class EmailVerificationToken(Base):
    __tablename__ = "email_verification_tokens"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    token_hash = Column(String, nullable=False, unique=True, index=True)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", backref="verification_tokens")


class OrganizationInvitation(Base):
    __tablename__ = "organization_invitations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    email = Column(String, nullable=False, index=True)
    role = Column(String, default="MEMBER") # ADMIN, MANAGER, MEMBER
    token_hash = Column(String, nullable=False, unique=True, index=True)
    invited_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    expires_at = Column(DateTime, nullable=False)
    accepted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", backref="invitations")
    inviter = relationship("User", foreign_keys=[invited_by_id])


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    user_email = Column(String, nullable=True)
    action = Column(String, nullable=False)
    resource_type = Column(String, nullable=True)
    resource_id = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", backref="audit_logs")
    user = relationship("User", backref="audit_logs")