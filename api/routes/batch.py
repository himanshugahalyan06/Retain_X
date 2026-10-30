"""
Batch CSV Ingestion and Scoring Route.

Handles bulk customer CSV upload, schema validation, batch scoring with the calibrated model,
multi-tenant database upsert, and downloadable scored CSV export.
"""

import os
import uuid
import io
import pandas as pd
from datetime import datetime
from typing import Dict, Any

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from api.dependencies import predictor, get_db
from churnguard.config import ARTIFACTS_DIR
from churnguard.database.models import User, Customer, Prediction, RetentionDecision
from churnguard.auth.dependencies import get_current_active_user, require_manager
from churnguard.services.training_service import get_active_company_predictor

router = APIRouter()

BATCH_EXPORTS_DIR = ARTIFACTS_DIR / "batch_exports"
BATCH_EXPORTS_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/v1/customers/batch-upload")
@router.post("/customers/upload")
async def batch_upload_customers(
    file: UploadFile = File(...),
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Ingest a CSV batch of customer accounts, validate columns, run batch scoring,
    persist records scoped to the tenant, and generate a downloadable scored export.
    """
    # 1. Validate file extension
    filename = file.filename or ""
    if not (filename.endswith(".csv") or filename.endswith(".CSV")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Please upload a standard CSV (.csv) file."
        )

    # 2. Read contents safely
    try:
        content = await file.read()
        if len(content) == 0:
            raise HTTPException(status_code=400, detail="Uploaded CSV file is empty.")
        if len(content) > 25 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File exceeds maximum allowed size of 25MB.")

        df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV file: {str(e)}")

    if df.empty:
        raise HTTPException(status_code=400, detail="Uploaded CSV contains zero data rows.")

    # 3. Schema inspection & required fields validation
    required_fields = ["tenure", "MonthlyCharges", "Contract"]
    missing_fields = [f for f in required_fields if f not in df.columns]
    if missing_fields:
        raise HTTPException(
            status_code=422,
            detail=f"Uploaded CSV is missing mandatory columns: {', '.join(missing_fields)}"
        )

    # 4. Fill missing columns with safe defaults
    standard_defaults = {
        "gender": "Female",
        "SeniorCitizen": 0,
        "Partner": "No",
        "Dependents": "No",
        "PhoneService": "Yes",
        "MultipleLines": "No",
        "InternetService": "Fiber optic",
        "OnlineSecurity": "No",
        "OnlineBackup": "No",
        "DeviceProtection": "No",
        "TechSupport": "No",
        "StreamingTV": "No",
        "StreamingMovies": "No",
        "PaperlessBilling": "Yes",
        "PaymentMethod": "Electronic check"
    }
    for col, default_val in standard_defaults.items():
        if col not in df.columns:
            df[col] = default_val

    if "TotalCharges" not in df.columns:
        df["TotalCharges"] = df["MonthlyCharges"] * df["tenure"]

    if "customer_id" not in df.columns and "customerID" not in df.columns:
        df["customer_id"] = [f"BATCH-{uuid.uuid4().hex[:8].upper()}" for _ in range(len(df))]
    elif "customerID" in df.columns and "customer_id" not in df.columns:
        df["customer_id"] = df["customerID"]

    # 5. Batch Prediction using calibrated company or platform model
    company_id = current_user.company_id
    job_id = uuid.uuid4().hex[:12]

    try:
        active_bundle = get_active_company_predictor(company_id, db)
        if active_bundle:
            pipeline = active_bundle["pipeline"]
            threshold = float(active_bundle["threshold"])
            probs = pipeline.predict_proba(df)[:, 1]
            scores = []
            for p in probs:
                p_val = float(p)
                scores.append({
                    "probability": p_val,
                    "prediction": int(p_val >= threshold),
                    "threshold": threshold,
                    "risk_tier": "High Risk" if p_val >= 0.45 else ("Medium Risk" if p_val >= 0.20 else "Low Risk")
                })
        else:
            scores = predictor.predict_batch(df)
    except Exception as e:
        try:
            scores = predictor.predict_batch(df)
        except Exception as inner_e:
            raise HTTPException(
                status_code=500,
                detail=f"Batch prediction pipeline execution failed: {str(inner_e)}"
            )

    high_risk_count = 0
    medium_risk_count = 0
    low_risk_count = 0
    total_at_risk_revenue = 0.0

    scored_records = []

    # 6. Database Persistence & Scored Export Generation
    try:
        for idx, row in df.iterrows():
            cid = str(row["customer_id"])
            score_meta = scores[idx]
            prob = score_meta["probability"]
            pred = score_meta["prediction"]
            threshold = score_meta["threshold"]
            tier = score_meta["risk_tier"]

            monthly = float(row.get("MonthlyCharges", 0.0) or 0.0)
            clv = monthly * 24.0

            if tier == "High Risk":
                high_risk_count += 1
                total_at_risk_revenue += clv
            elif tier == "Medium Risk":
                medium_risk_count += 1
            else:
                low_risk_count += 1

            # Upsert Customer
            db_cust = db.query(Customer).filter(Customer.customer_id == cid).first()
            if db_cust and db_cust.company_id is None:
                db_cust.company_id = company_id

            if not db_cust:
                db_cust = Customer(
                    customer_id=cid,
                    company_id=company_id,
                    gender=str(row.get("gender", "Female")),
                    SeniorCitizen=int(row.get("SeniorCitizen", 0) or 0),
                    Partner=str(row.get("Partner", "No")),
                    Dependents=str(row.get("Dependents", "No")),
                    tenure=int(row.get("tenure", 0) or 0),
                    PhoneService=str(row.get("PhoneService", "Yes")),
                    MultipleLines=str(row.get("MultipleLines", "No")),
                    InternetService=str(row.get("InternetService", "Fiber optic")),
                    OnlineSecurity=str(row.get("OnlineSecurity", "No")),
                    OnlineBackup=str(row.get("OnlineBackup", "No")),
                    DeviceProtection=str(row.get("DeviceProtection", "No")),
                    TechSupport=str(row.get("TechSupport", "No")),
                    StreamingTV=str(row.get("StreamingTV", "No")),
                    StreamingMovies=str(row.get("StreamingMovies", "No")),
                    Contract=str(row.get("Contract", "Month-to-month")),
                    PaperlessBilling=str(row.get("PaperlessBilling", "Yes")),
                    PaymentMethod=str(row.get("PaymentMethod", "Electronic check")),
                    MonthlyCharges=monthly,
                    TotalCharges=float(row.get("TotalCharges", monthly * float(row.get("tenure", 1))) or 0.0),
                    risk_segment=tier,
                    value_segment="HIGH_VALUE" if clv >= 1500 else "MEDIUM_VALUE"
                )
                db.add(db_cust)
            else:
                db_cust.risk_segment = tier
                db_cust.MonthlyCharges = monthly

            # Record Prediction
            pred_record = Prediction(
                customer_id=cid,
                company_id=company_id,
                probability=prob,
                prediction=pred,
                threshold=threshold,
                model_version=score_meta["model_version"],
                threshold_version="cost-optimal-v2"
            )
            db.add(pred_record)
            db.flush()

            # Record Retention Decision with economics
            int_cost = 50.0
            uplift_eff = 0.25
            exp_ret_val = clv * uplift_eff
            exp_net_val = exp_ret_val - int_cost
            roi_calc = (exp_net_val / int_cost) if int_cost > 0 else 0.0

            decision = RetentionDecision(
                customer_id=cid,
                prediction_id=pred_record.id,
                company_id=company_id,
                customer_value=clv,
                intervention_cost=int_cost,
                expected_effectiveness=uplift_eff,
                expected_retention_value=round(exp_ret_val, 2),
                expected_net_value=round(exp_net_val, 2),
                roi=round(roi_calc, 2),
                priority="HIGH" if tier == "High Risk" else "MEDIUM" if tier == "Medium Risk" else "LOW",
                recommended_action="15% Retention Discount" if tier == "High Risk" else "Proactive Health Check",
                decision="CONTACT" if tier in ("High Risk", "Medium Risk") else "NO_ACTION",
                workflow_status="REVIEW_REQUIRED" if tier in ("High Risk", "Medium Risk") else "AUTO_RESOLVED"
            )
            db.add(decision)

            scored_records.append({
                "customer_id": cid,
                "churn_probability": round(prob, 4),
                "churn_flag": pred,
                "decision_threshold": threshold,
                "risk_tier": tier,
                "risk_score": score_meta["risk_score"],
                "contract": row.get("Contract"),
                "tenure_months": row.get("tenure"),
                "monthly_charges": monthly,
                "estimated_clv": round(clv, 2),
                "model_version": score_meta["model_version"]
            })

        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to persist batch records: {str(e)}")

    # 7. Write Export CSV
    export_filename = f"{company_id}_{job_id}.csv"
    export_path = BATCH_EXPORTS_DIR / export_filename
    pd.DataFrame(scored_records).to_csv(export_path, index=False)

    return {
        "job_id": job_id,
        "total_records": len(df),
        "high_risk_count": high_risk_count,
        "medium_risk_count": medium_risk_count,
        "low_risk_count": low_risk_count,
        "estimated_at_risk_revenue": round(total_at_risk_revenue, 2),
        "threshold_used": predictor.threshold,
        "download_url": f"/api/v1/customers/batch-export/{job_id}",
        "message": f"Successfully ingested and scored {len(df)} customer records."
    }


@router.get("/v1/customers/batch-export/{job_id}")
@router.get("/customers/batch-export/{job_id}")
def download_batch_export(
    job_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Download scored CSV export for a completed batch job.
    Enforces tenant ownership.
    """
    company_id = current_user.company_id
    export_filename = f"{company_id}_{job_id}.csv"
    export_path = BATCH_EXPORTS_DIR / export_filename

    if not export_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Batch export file not found or access denied."
        )

    return FileResponse(
        path=export_path,
        media_type="text/csv",
        filename=f"retention_scored_batch_{job_id}.csv"
    )
