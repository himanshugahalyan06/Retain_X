"""
Company Model Training & Registry API Routes.

Provides endpoints for launching background training jobs, polling job progress,
listing candidate models, inspecting evaluation curves and feature importances,
and activating validated company models.
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session

from api.dependencies import get_db
from churnguard.database.models import User, CompanyTrainingJob, CompanyModel
from churnguard.auth.dependencies import get_current_active_user
from churnguard.services.training_service import (
    start_company_training_job,
    activate_company_model
)

router = APIRouter()


class StartTrainingRequest(BaseModel):
    dataset_id: int
    target_column: str
    positive_class: Optional[str] = "1"
    algorithm_preference: Optional[str] = None


@router.post("/v1/training-jobs")
@router.post("/training-jobs")
def create_training_job(
    request: StartTrainingRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Launch an asynchronous ML training and benchmarking job on the company's dataset.
    """
    try:
        job_id = start_company_training_job(
            company_id=current_user.company_id,
            dataset_id=request.dataset_id,
            target_column=request.target_column,
            positive_class=request.positive_class or "1",
            algorithm_preference=request.algorithm_preference,
            db=db
        )
        return {
            "success": True,
            "job_id": job_id,
            "status": "QUEUED",
            "message": "Model training job queued in background."
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to start training: {str(e)}")


@router.get("/v1/training-jobs")
@router.get("/training-jobs")
def list_training_jobs(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """
    List all training jobs for the current tenant.
    """
    jobs = db.query(CompanyTrainingJob).filter(
        CompanyTrainingJob.company_id == current_user.company_id
    ).order_by(CompanyTrainingJob.created_at.desc()).all()

    return [
        {
            "id": job.id,
            "dataset_id": job.dataset_id,
            "status": job.status,
            "progress": job.progress,
            "stage": job.stage,
            "target_column": job.target_column,
            "positive_class": job.positive_class,
            "best_algorithm": job.best_algorithm,
            "created_at": job.created_at.isoformat() if job.created_at else None,
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
            "error_message": job.error_message
        }
        for job in jobs
    ]


@router.get("/v1/training-jobs/{job_id}")
@router.get("/training-jobs/{job_id}")
def get_training_job(
    job_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Poll status, real-time progress, metrics, and candidate benchmarks of a training job.
    """
    job = db.query(CompanyTrainingJob).filter(
        CompanyTrainingJob.id == job_id,
        CompanyTrainingJob.company_id == current_user.company_id
    ).first()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Training job not found or access denied."
        )

    # Check if a model was produced by this job
    model = db.query(CompanyModel).filter(
        CompanyModel.job_id == job_id,
        CompanyModel.company_id == current_user.company_id
    ).first()

    return {
        "id": job.id,
        "dataset_id": job.dataset_id,
        "status": job.status,
        "progress": job.progress,
        "stage": job.stage,
        "target_column": job.target_column,
        "positive_class": job.positive_class,
        "algorithms_evaluated": job.algorithms_evaluated or [],
        "best_algorithm": job.best_algorithm,
        "metrics": job.metrics_json or {},
        "error_message": job.error_message,
        "model_id": model.id if model else None,
        "model_version": model.version if model else None,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "completed_at": job.completed_at.isoformat() if job.completed_at else None
    }


@router.get("/v1/models")
@router.get("/models")
def list_company_models(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """
    List all trained model versions in the company model registry.
    """
    models = db.query(CompanyModel).filter(
        CompanyModel.company_id == current_user.company_id
    ).order_by(CompanyModel.created_at.desc()).all()

    return [
        {
            "id": m.id,
            "version": m.version,
            "dataset_id": m.dataset_id,
            "algorithm": m.algorithm,
            "is_active": m.is_active,
            "threshold": m.threshold,
            "test_metrics": m.test_metrics or {},
            "feature_count": len(m.feature_schema.get("features", [])) if m.feature_schema else 0,
            "created_at": m.created_at.isoformat() if m.created_at else None
        }
        for m in models
    ]


@router.get("/v1/models/active")
@router.get("/models/active")
def get_active_model(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Optional[Dict[str, Any]]:
    """
    Get the currently active model for the company.
    """
    model = db.query(CompanyModel).filter(
        CompanyModel.company_id == current_user.company_id,
        CompanyModel.is_active == True
    ).first()

    if not model:
        return None

    return {
        "id": model.id,
        "version": model.version,
        "dataset_id": model.dataset_id,
        "algorithm": model.algorithm,
        "is_active": True,
        "threshold": model.threshold,
        "test_metrics": model.test_metrics or {},
        "created_at": model.created_at.isoformat() if model.created_at else None
    }


@router.get("/v1/models/{model_id}")
@router.get("/models/{model_id}")
def get_model_details(
    model_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Retrieve in-depth model details, evaluation curves (ROC, PR, Confusion Matrix, Calibration, Cost vs Threshold),
    and SHAP / feature importance.
    """
    model = db.query(CompanyModel).filter(
        CompanyModel.id == model_id,
        CompanyModel.company_id == current_user.company_id
    ).first()

    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found or access denied."
        )

    # Fetch corresponding training job for candidate comparison
    job = None
    if model.training_job_id:
        job = db.query(CompanyTrainingJob).filter(
            CompanyTrainingJob.id == model.training_job_id,
            CompanyTrainingJob.company_id == current_user.company_id
        ).first()

    return {
        "id": model.id,
        "version": model.version,
        "dataset_id": model.dataset_id,
        "algorithm": model.algorithm,
        "is_active": model.is_active,
        "threshold": model.threshold,
        "test_metrics": model.test_metrics or {},
        "evaluation_curves": model.evaluation_curves or {},
        "feature_importance": model.feature_importance or [],
        "feature_schema": model.feature_schema or {},
        "algorithms_evaluated": job.algorithms_evaluated if job else [],
        "created_at": model.created_at.isoformat() if model.created_at else None
    }


@router.post("/v1/models/{model_id}/activate")
@router.post("/models/{model_id}/activate")
def activate_model_endpoint(
    model_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Safely activate a validated model for company-specific scoring and inference.
    """
    try:
        model = activate_company_model(
            company_id=current_user.company_id,
            model_id=model_id,
            db=db
        )
        return {
            "success": True,
            "message": f"Model {model.version} ({model.algorithm}) is now active for predictions.",
            "model_id": model.id,
            "version": model.version,
            "is_active": True
        }
    except (ValueError, FileNotFoundError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to activate model: {str(e)}")
