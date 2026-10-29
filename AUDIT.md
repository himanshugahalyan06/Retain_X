# RETAINX AI — COMPREHENSIVE ARCHITECTURE & SYSTEM AUDIT (PHASE 1)

## Executive Summary
RetainX AI is an end-to-end Machine Learning customer churn application consisting of a Random Forest classification backend (FastAPI, SQLite, SHAP) and a React dashboard frontend. While the foundational churn prediction, threshold optimization, and SHAP explainability modules are solid, the downstream decision engine suffers from mathematical fallacies in its intervention scoring, lacks true causal uplift/treatment-control tracking, and hardcodes business rules inside core Python calculation scripts.

This audit documents the current state, identifies technical debt and conceptual flaws, and outlines the precise migration roadmap to convert RetainX into a production-grade **Cost-Sensitive Customer Retention Decision Intelligence Platform**.

---

## 1. Current System Architecture
```
[ Customer Data (Telco CSV) ]
            │
            ▼
[ Data Preprocessing & Feature Pipeline ] (encoder.py, pipeline.py)
            │
            ▼
[ Random Forest Model & Threshold Optimizer ] (train.py, threshold_optimizer.py)
            │
            ├──► [ SHAP Explainer ] (shap_explainer.py)
            │
            └──► [ Cost Matrix & Value Estimator ] (cost_matrix.py, value_estimator.py)
                        │
                        ▼
            [ Next Best Action Engine ] (next_best_action.py) ◄── *CRITICAL MATHEMATICAL BUG HERE*
                        │
                        ▼
            [ FastAPI Router & SQLite Database ] (api/routes, models.py)
                        │
                        ▼
            [ React Retention Dashboard Frontend ] (frontend/src)
```

---

## 2. Identified Strengths (To Preserve)
- **Churn Prediction Engine**: Random Forest model with modular preprocessing, standard feature scaling/one-hot encoding, and saved artifacts (`rf_model.pkl`, `pipeline.pkl`).
- **Cost-Sensitive Threshold Optimization**: Validation-based threshold search minimizing cost of False Positives vs False Negatives.
- **Explainable AI (SHAP)**: Global and local SHAP feature contributions for individual predictions.
- **Database & API Foundations**: SQLite database models with SQLAlchemy ORM, FastAPI REST endpoints for prediction, explainability, and retention actions.
- **Modern React Frontend**: Existing UI components with interactive charts, churn forms, and monitoring cards.

---

## 3. Critical Technical Debt & Conceptual Flaws

### A. Mathematical Fallacy in Retention Scoring (`next_best_action.py`)
- **Current Formula**: `expected_retention_val = churn_probability * customer_value * effective_rate`
- **Flaw**: Multiplying baseline churn probability by assigned intervention effectiveness is conceptually incorrect. It asks "what is the value of retaining someone with churn risk who accepts a treatment?", but ignores baseline retention without treatment.
- **Solution**: Replace with treatment-control uplift formula:
  $$\text{Uplift} = P(\text{retained} \mid \text{Treatment}) - P(\text{retained} \mid \text{Control})$$
  $$\text{Expected Incremental Value} = \text{Customer Value} \times \text{Uplift}$$
  $$\text{Expected Net Value} = \text{Expected Incremental Value} - \text{Intervention Cost}$$
  $$\text{ROI} = \frac{\text{Expected Net Value}}{\text{Intervention Cost}}$$

### B. Lack of True Uplift / Treatment-Control Modeling
- Current `src/churnguard/uplift/uplift_base.py` is an un-instantiated abstract interface.
- Treatments are statically assigned manually configured effectiveness rates.
- No synthetic treatment-control experiment simulator exists to train and demonstrate uplift ML models cleanly without claiming observational data is causal proof.

### C. Hardcoded Context Multipliers & Business Rules
- `next_best_action.py` contains inline `if "fiber" in internet...` and `if monthly > 300...` rules.
- Rules must be decoupled into a configurable `RetentionPolicyEngine` that handles eligibility, budget constraints, contact fatigue, and minimum ROI rules.

### D. Missing Campaign & Experiment Entities
- No database model for Retention Campaigns, Treatment vs Control assignments, or campaign-level ROI tracking.
- `InterventionOutcome` miscalculates `actual_value_saved` as `customer_value - cost` regardless of actual control baseline.

### E. Frontend & API Architectural Gaps
- API returns unstructured dictionaries in several routes and lacks error handling standard structures.
- Direct database mutation in SQLite without migration tools (Alembic missing).
- Retention Queue lacks multi-alternative display, human-in-the-loop override logging with mandatory reasons, and campaign analytics tabs.

---

## 4. Master Migration & Refactoring Plan

| Phase | Core Objective | Key Deliverables |
| :--- | :--- | :--- |
| **Phase 1** | **Audit & Blueprint** | `AUDIT.md`, System Diagram & Architecture Mapping |
| **Phase 2** | **Retention Mathematics Refactoring** | Causal uplift math, `NO_ACTION` fallback, net value & ROI formulas |
| **Phase 3** | **Uplift Model & Synthetic Simulator** | Two-Model Uplift learner, Synthetic Experiment Simulator, Uplift Metrics |
| **Phase 4** | **Campaign & Experiment Engine** | Campaign DB models, Treatment/Control allocation, Outcome tracking |
| **Phase 5** | **Policy & Next Best Action Engine** | `RetentionPolicyEngine`, candidate ranking, alternative explanations |
| **Phase 6** | **Human-in-the-Loop & Audit Logging** | Action workflow (`REVIEW_REQUIRED` -> `APPROVED` / `OVERRIDDEN`), Manager log |
| **Phase 7** | **Enterprise API & Service Layer** | Clean FastAPI routes, Pydantic schemas, Service layer isolation |
| **Phase 8** | **Database Migrations (Alembic)** | Alembic setup, schema migrations, seed script updates |
| **Phase 9** | **Professional Frontend Workspace** | Redesigned Retention Queue, Customer Drawer, Campaign Dashboard |
| **Phase 10** | **Monitoring & Retraining Pipeline** | Uplift drift detector, retrain CLI command, MLflow tracking |
| **Phase 11** | **Validation & Documentation** | Full pytest suite, README update, CHANGELOG, deployment guide |

---

## 5. File Modification Checklist

- [x] `AUDIT.md` (Created)
- [ ] `src/churnguard/retention/next_best_action.py` -> Refactor with Causal Uplift & Policy Engine
- [ ] `src/churnguard/uplift/uplift_model.py` -> Implement Two-Model Uplift & Simulator
- [ ] `src/churnguard/retention/policy_engine.py` -> New business policy engine
- [ ] `src/churnguard/value/value_estimator.py` -> Refactor CLV to Estimated Customer Economic Value
- [ ] `src/churnguard/database/models.py` -> Add Campaign, ManagerLog, refine InterventionOutcome
- [ ] `src/churnguard/services/` -> Create service layer (Prediction, Retention, Campaign, Uplift)
- [ ] `api/routes/` -> Update routes to use service layer with structured Pydantic schemas
- [ ] `frontend/src/pages/RetentionPage.jsx` & `CampaignPage.jsx` -> Enterprise retention & campaign hub
- [ ] `tests/` -> Complete unit & integration test suite verifying exact math formulas

---
*Created as part of RetainX AI Staff Engineering System Upgrade.*
