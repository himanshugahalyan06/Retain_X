import random
from datetime import datetime, timedelta
from churnguard.database.db import SessionLocal
from churnguard.database.models import (
    Company,
    User,
    BusinessSettings,
    Intervention,
    Customer,
    Prediction,
    RetentionDecision,
    InterventionOutcome,
    Campaign,
    CampaignAssignment,
    ManagerLog,
    CustomerBehavioralData,
    CustomerCRMData,
    CustomerSupportData,
    CustomerPaymentData
)
from churnguard.retention.next_best_action import NextBestActionEngine
from churnguard.value.value_estimator import ValueEstimator
from churnguard.auth.security import hash_password

ACCOUNT_OWNERS = ["Sarah Jenkins", "Alex Rivera", "David Kim", "Elena Rostova", "Marcus Vance"]

def seed_enriched_customer_data(db, customer: Customer, prob: float):
    """
    Generates realistic synthetic behavioral, CRM, support, and payment metrics
    strongly correlated with churn risk.
    Higher churn risk (prob >= 0.5) -> lower usage, higher tickets, worse CSAT, payment delays.
    """
    is_high_risk = (prob >= 0.5)

    # 1. Behavioral Data
    behavioral = db.query(CustomerBehavioralData).filter_by(customer_id=customer.customer_id).first()
    if not behavioral:
        behavioral = CustomerBehavioralData(customer_id=customer.customer_id)
        db.add(behavioral)

    if is_high_risk:
        behavioral.login_frequency = round(random.uniform(0.5, 4.5), 1)
        behavioral.feature_usage_count = random.randint(3, 25)
        behavioral.avg_session_duration_minutes = round(random.uniform(2.0, 10.0), 1)
        behavioral.days_since_last_login = random.randint(12, 45)
    else:
        behavioral.login_frequency = round(random.uniform(14.0, 32.0), 1)
        behavioral.feature_usage_count = random.randint(75, 260)
        behavioral.avg_session_duration_minutes = round(random.uniform(18.0, 48.0), 1)
        behavioral.days_since_last_login = random.randint(0, 3)

    behavioral.last_active_date = datetime.utcnow() - timedelta(
        days=behavioral.days_since_last_login,
        hours=random.randint(1, 12)
    )

    # 2. CRM Data
    crm = db.query(CustomerCRMData).filter_by(customer_id=customer.customer_id).first()
    if not crm:
        crm = CustomerCRMData(customer_id=customer.customer_id)
        db.add(crm)

    if is_high_risk:
        crm.lifecycle_stage = "churned" if prob > 0.85 else "at_risk"
        crm.account_owner = random.choice(ACCOUNT_OWNERS)
        crm.deal_value = round((customer.MonthlyCharges or 85.0) * max(customer.tenure or 12, 12) * random.uniform(0.8, 1.1), 2)
        crm.last_contact_date = datetime.utcnow() - timedelta(days=random.randint(20, 75))
    else:
        crm.lifecycle_stage = "onboarding" if (customer.tenure or 12) <= 3 else "active"
        crm.account_owner = random.choice(ACCOUNT_OWNERS)
        crm.deal_value = round((customer.MonthlyCharges or 85.0) * max(customer.tenure or 12, 24) * random.uniform(1.2, 1.8), 2)
        crm.last_contact_date = datetime.utcnow() - timedelta(days=random.randint(2, 14))

    # 3. Support Data
    support = db.query(CustomerSupportData).filter_by(customer_id=customer.customer_id).first()
    if not support:
        support = CustomerSupportData(customer_id=customer.customer_id)
        db.add(support)

    if is_high_risk:
        support.total_tickets = random.randint(4, 12)
        support.avg_resolution_time_hours = round(random.uniform(18.5, 64.0), 1)
        support.last_csat_score = random.choice([1, 1, 2, 2, 3])
    else:
        support.total_tickets = random.choice([0, 0, 1, 2])
        support.avg_resolution_time_hours = round(random.uniform(1.2, 6.5), 1) if support.total_tickets > 0 else 0.0
        support.last_csat_score = random.choice([4, 5, 5]) if support.total_tickets > 0 else 5

    # 4. Payment Data
    payment = db.query(CustomerPaymentData).filter_by(customer_id=customer.customer_id).first()
    if not payment:
        payment = CustomerPaymentData(customer_id=customer.customer_id)
        db.add(payment)

    if is_high_risk:
        payment.failed_payments_count = random.choice([1, 2, 3, 4])
        payment.plan_downgrades_count = random.choice([0, 1, 2])
        payment.days_since_last_payment_delay = random.randint(3, 28)
    else:
        payment.failed_payments_count = 0
        payment.plan_downgrades_count = 0
        payment.days_since_last_payment_delay = 0

def seed_db():
    db = SessionLocal()
    try:
        # 0. Seed Default Company and Admin User
        company = db.query(Company).first()
        if not company:
            company = Company(
                name="Acme Corp",
                plan="ENTERPRISE"
            )
            db.add(company)
            db.commit()
            db.refresh(company)
            print(f"Default tenant company '{company.name}' seeded.")

        admin_user = db.query(User).filter_by(email="admin@churnguard.ai").first()
        if not admin_user:
            admin_user = User(
                email="admin@churnguard.ai",
                hashed_password=hash_password("password123"),
                full_name="System Admin",
                role="ADMIN",
                company_id=company.id,
                is_active=True
            )
            db.add(admin_user)
            db.commit()
            print("Default admin user 'admin@churnguard.ai' seeded.")

        # Check settings
        settings = db.query(BusinessSettings).first()
        if not settings:
            settings = BusinessSettings(
                id=1,
                company_id=company.id,
                false_positive_cost=500.0,
                false_negative_cost=5000.0,
                default_gross_margin=0.65,
                expected_lifetime_m2m=12,
                expected_lifetime_one_year=24,
                expected_lifetime_two_year=36,
                optimized_threshold=0.1,
                min_roi_threshold=0.20,
                min_net_value_threshold=100.0,
                contact_cooldown_days=30
            )
            db.add(settings)
            db.commit()
            print("Business settings seeded.")

        # Check interventions
        count = db.query(Intervention).count()
        if count == 0:
            default_interventions = [
                Intervention(
                    name="15% Retention Discount",
                    description="15% discount on monthly subscription fee for 6 months",
                    cost=2000.0,
                    expected_effectiveness=0.22,
                    category="Discount",
                    active=True
                ),
                Intervention(
                    name="Free Technical Support",
                    description="Free priority tech support and maintenance setup",
                    cost=500.0,
                    expected_effectiveness=0.26,
                    category="Support",
                    active=True
                ),
                Intervention(
                    name="Premium Plan Upgrade",
                    description="Free 3-month upgrade to premium feature bundle",
                    cost=1000.0,
                    expected_effectiveness=0.18,
                    category="Upgrade",
                    active=True
                ),
                Intervention(
                    name="Loyalty VIP Reward",
                    description="Loyalty reward points package and gift voucher",
                    cost=800.0,
                    expected_effectiveness=0.15,
                    category="Loyalty",
                    active=True
                ),
                Intervention(
                    name="Priority Support",
                    description="Assigned dedicated account manager support",
                    cost=1500.0,
                    expected_effectiveness=0.24,
                    category="Support",
                    active=True
                )
            ]
            db.add_all(default_interventions)
            db.commit()
            print("Default interventions seeded.")

        # Check Demo Campaign
        demo_campaign = db.query(Campaign).first()
        if not demo_campaign:
            demo_campaign = Campaign(
                name="Demo Retention Experiment Q3",
                description="Simulated A/B retention campaign evaluating Discount vs Control",
                status="ACTIVE",
                objective="Evaluate causal incremental retention of targeted interventions",
                target_segment="HIGH_RISK_HIGH_VALUE",
                budget=100000.0,
                spent_budget=24500.0,
                treatment_pct=0.50,
                control_pct=0.50,
                start_date=datetime.utcnow() - timedelta(days=30)
            )
            db.add(demo_campaign)
            db.commit()
            print("Demo Campaign seeded.")

        # Seed Customer Campaign Data if fewer than 10 predictions exist
        prediction_count = db.query(Prediction).count()
        if prediction_count < 10:
            print("Seeding customer predictions, retention decisions, and enriched domain tables...")

            contracts = ["Month-to-month", "One year", "Two year"]
            internet_services = ["Fiber optic", "DSL", "No"]
            payment_methods = ["Electronic check", "Mailed check", "Bank transfer (automatic)", "Credit card (automatic)"]
            
            interventions = db.query(Intervention).all()
            val_estimator = ValueEstimator(db)
            nba_engine = NextBestActionEngine(db)

            for i in range(1, 41):
                cust_id = f"CG-100{i:02d}"
                contract = random.choice(contracts)
                monthly_charges = round(random.uniform(50.0, 115.0), 2)
                tenure = random.randint(3, 60)
                total_charges = round(monthly_charges * tenure, 2)
                
                cust = Customer(
                    customer_id=cust_id,
                    company_id=company.id,
                    gender=random.choice(["Male", "Female"]),
                    SeniorCitizen=random.choice([0, 0, 1]),
                    Partner=random.choice(["Yes", "No"]),
                    Dependents=random.choice(["Yes", "No"]),
                    tenure=tenure,
                    PhoneService="Yes",
                    MultipleLines=random.choice(["Yes", "No"]),
                    InternetService=random.choice(internet_services),
                    OnlineSecurity=random.choice(["Yes", "No"]),
                    OnlineBackup=random.choice(["Yes", "No"]),
                    DeviceProtection=random.choice(["Yes", "No"]),
                    TechSupport=random.choice(["Yes", "No"]),
                    StreamingTV=random.choice(["Yes", "No"]),
                    StreamingMovies=random.choice(["Yes", "No"]),
                    Contract=contract,
                    PaperlessBilling=random.choice(["Yes", "No"]),
                    PaymentMethod=random.choice(payment_methods),
                    MonthlyCharges=monthly_charges,
                    TotalCharges=total_charges,
                    risk_segment="HIGH" if contract == "Month-to-month" else "LOW",
                    value_segment="VIP" if monthly_charges > 90 else "MEDIUM_VALUE",
                    combined_segment="HIGH_RISK_VIP" if contract == "Month-to-month" and monthly_charges > 90 else "LOW_RISK_MEDIUM_VALUE"
                )
                db.add(cust)
                
                # Prediction probability
                prob = random.uniform(0.55, 0.90) if contract == "Month-to-month" else random.uniform(0.05, 0.35)
                pred_val = 1 if prob >= settings.optimized_threshold else 0
                
                created_date = datetime.utcnow() - timedelta(days=random.randint(2, 25))
                pred = Prediction(
                    probability=prob,
                    prediction=pred_val,
                    threshold=settings.optimized_threshold,
                    customer_id=cust_id,
                    company_id=company.id,
                    created_at=created_date
                )
                db.add(pred)
                db.commit() # Get pred.id

                # Seed enriched domain data for this customer
                seed_enriched_customer_data(db, cust, prob)
                
                cust_val = val_estimator.estimate_value(monthly_charges=monthly_charges, contract=contract, tenure=tenure)
                
                cust_data = {
                    "Contract": contract,
                    "InternetService": cust.InternetService,
                    "tenure": tenure,
                    "MonthlyCharges": monthly_charges,
                    "TechSupport": cust.TechSupport
                }
                decision_details = nba_engine.select_next_best_action(prob, cust_val, cust_data)

                rec_action = decision_details["recommended_action"]
                rec_name = rec_action["name"] if rec_action else "NO_ACTION"
                rec_cost = rec_action["cost"] if rec_action else 0.0
                rec_uplift = rec_action["predicted_uplift"] if rec_action else 0.0

                dec = RetentionDecision(
                    customer_id=cust_id,
                    prediction_id=pred.id,
                    company_id=company.id,
                    customer_value=cust_val,
                    intervention_cost=rec_cost,
                    expected_effectiveness=rec_uplift,
                    expected_retention_value=decision_details["expected_retention_value"],
                    expected_net_value=decision_details["expected_net_value"],
                    roi=decision_details["roi"],
                    priority=decision_details["priority"],
                    recommended_action=rec_name,
                    decision=decision_details["decision"],
                    workflow_status="REVIEW_REQUIRED" if i % 2 == 0 else "APPROVED",
                    assigned_campaign_id=demo_campaign.id,
                    created_at=created_date
                )
                db.add(dec)

                # Assign 50% treatment, 50% control to campaign
                group = "TREATMENT" if i % 2 == 1 else "CONTROL"
                matching_inter = next((inter for inter in interventions if inter.name == rec_name), None)
                inter_id = matching_inter.id if matching_inter else None

                assignment = CampaignAssignment(
                    campaign_id=demo_campaign.id,
                    customer_id=cust_id,
                    company_id=company.id,
                    assignment_group=group,
                    intervention_id=inter_id if group == "TREATMENT" else None,
                    assignment_timestamp=created_date
                )
                db.add(assignment)

                # Outcomes for completed cases
                if i <= 30:
                    retained = (random.random() < 0.72) if group == "TREATMENT" else (random.random() < 0.50)
                    status = "RETAINED" if retained else "CHURNED"
                    
                    outcome = InterventionOutcome(
                        customer_id=cust_id,
                        intervention_id=inter_id if group == "TREATMENT" else None,
                        campaign_id=demo_campaign.id,
                        prediction_id=pred.id,
                        company_id=company.id,
                        assignment_group=group,
                        predicted_churn_probability=prob,
                        predicted_uplift=rec_uplift,
                        customer_value=cust_val,
                        intervention_cost=rec_cost if group == "TREATMENT" else 0.0,
                        predicted_effectiveness=rec_uplift,
                        expected_net_value=decision_details["expected_net_value"],
                        outcome_window_days=30,
                        action_date=created_date,
                        outcome_date=created_date + timedelta(days=5),
                        retained=retained,
                        churned=not retained,
                        actual_revenue=cust_val if retained else 0.0,
                        actual_cost=rec_cost if group == "TREATMENT" else 0.0,
                        actual_value_saved=(cust_val - rec_cost) if retained and group == "TREATMENT" else 0.0,
                        notes=f"Simulated outcome for {group} customer.",
                        status=status
                    )
                    db.add(outcome)

            db.commit()
            print("Customer predictions and campaign assignments seeded successfully.")
        else:
            # Backfill any existing customer missing enriched data or company_id
            customers = db.query(Customer).all()
            for c in customers:
                if c.company_id is None:
                    c.company_id = company.id
                pred = db.query(Prediction).filter_by(customer_id=c.customer_id).order_by(Prediction.created_at.desc()).first()
                if pred and pred.company_id is None:
                    pred.company_id = company.id
                c_prob = pred.probability if pred else (0.75 if c.Contract == "Month-to-month" else 0.20)
                seed_enriched_customer_data(db, c, c_prob)

            # Backfill any null company_ids
            db.query(Prediction).filter(Prediction.company_id.is_(None)).update({"company_id": company.id})
            db.query(RetentionDecision).filter(RetentionDecision.company_id.is_(None)).update({"company_id": company.id})
            db.query(Campaign).filter(Campaign.company_id.is_(None)).update({"company_id": company.id})
            db.query(Intervention).filter(Intervention.company_id.is_(None)).update({"company_id": company.id})

            db.commit()
            print("Enriched customer profiles and company_id backfilled for existing customers.")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()

