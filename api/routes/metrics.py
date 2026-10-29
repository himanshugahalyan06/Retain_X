from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from api.dependencies import get_db
from churnguard.database.models import User, Prediction, PredictionLog
from churnguard.auth.dependencies import get_current_active_user

router = APIRouter()

@router.get("/metrics")
def metrics(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get company-scoped system metrics including prediction count, average latency, and churn distribution.
    """
    try:
        company_id = current_user.company_id
        
        # Company-isolated prediction count and churn breakdown
        total_predictions = db.query(func.count(Prediction.id)).filter(Prediction.company_id == company_id).scalar() or 0
        
        if total_predictions == 0:
            # Strictly zeroed for fresh company with no predictions
            avg_latency = 0.0
            churn_count = 0
        else:
            avg_latency = db.query(func.avg(PredictionLog.latency)).filter(
                PredictionLog.company_id == company_id
            ).scalar() or 0.05
            churn_count = db.query(func.count(Prediction.id)).filter(
                Prediction.company_id == company_id,
                Prediction.prediction == 1
            ).scalar() or 0

        non_churn_count = total_predictions - churn_count

        
        return {
            "total_predictions": total_predictions,
            "average_latency_seconds": round(avg_latency, 4),
            "predictions_distribution": {
                "churn": churn_count,
                "non_churn": non_churn_count
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))