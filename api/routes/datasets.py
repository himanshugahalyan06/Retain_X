"""
Dataset Management & Profiling API Routes.

Handles tenant-isolated dataset upload, schema inspection, dynamic profiling,
data preview, and dataset deletion.
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, status
from sqlalchemy.orm import Session

from api.dependencies import get_db
from churnguard.database.models import User, CompanyDataset
from churnguard.auth.dependencies import get_current_active_user
from churnguard.services.dataset_service import (
    save_and_inspect_dataset,
    profile_dataset,
    get_dataset_preview
)

router = APIRouter()


class TargetConfigRequest(BaseModel):
    target_column: str
    positive_class: Optional[str] = "1"


@router.post("/v1/datasets/upload")
@router.post("/datasets/upload")
async def upload_dataset_endpoint(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Upload a customer dataset (CSV) for company-specific profiling and training.
    """
    filename = file.filename or "dataset.csv"
    if not (filename.endswith(".csv") or filename.endswith(".CSV")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Please upload a CSV (.csv) file."
        )

    try:
        content = await file.read()
        dataset = save_and_inspect_dataset(
            company_id=current_user.company_id,
            file_bytes=content,
            filename=filename,
            db=db
        )
        return {
            "success": True,
            "dataset_id": dataset.id,
            "name": dataset.name,
            "row_count": dataset.row_count,
            "col_count": dataset.col_count,
            "status": dataset.status,
            "schema": dataset.schema_json,
            "message": f"Successfully uploaded {filename} ({dataset.row_count} rows, {dataset.col_count} columns)."
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process dataset: {str(e)}")


@router.get("/v1/datasets")
@router.get("/datasets")
def list_datasets_endpoint(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """
    List all datasets belonging to the authenticated company.
    """
    datasets = db.query(CompanyDataset).filter(
        CompanyDataset.company_id == current_user.company_id
    ).order_by(CompanyDataset.created_at.desc()).all()

    return [
        {
            "id": d.id,
            "name": d.name,
            "row_count": d.row_count,
            "col_count": d.col_count,
            "file_size_bytes": d.file_size_bytes,
            "status": d.status,
            "target_column": d.target_column,
            "positive_class": d.positive_class,
            "created_at": d.created_at.isoformat() if d.created_at else None,
            "has_profile": d.profile_json is not None
        }
        for d in datasets
    ]


@router.get("/v1/datasets/{dataset_id}")
@router.get("/datasets/{dataset_id}")
def get_dataset_details_endpoint(
    dataset_id: int,
    limit: int = 20,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get dataset metadata and first N preview rows.
    """
    try:
        preview = get_dataset_preview(
            dataset_id=dataset_id,
            company_id=current_user.company_id,
            limit=limit,
            db=db
        )
        dataset = db.query(CompanyDataset).filter(
            CompanyDataset.id == dataset_id,
            CompanyDataset.company_id == current_user.company_id
        ).first()

        preview["schema"] = dataset.schema_json
        preview["profile"] = dataset.profile_json
        return preview
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/v1/datasets/{dataset_id}/profile")
@router.post("/datasets/{dataset_id}/profile")
def profile_dataset_endpoint(
    dataset_id: int,
    config: Optional[TargetConfigRequest] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Generate or update profiling statistics and dynamic EDA charts for the dataset.
    """
    try:
        target = config.target_column if config else None
        pos = config.positive_class if config else None
        profile = profile_dataset(
            dataset_id=dataset_id,
            company_id=current_user.company_id,
            target_column=target,
            positive_class=pos,
            db=db
        )
        return {
            "success": True,
            "dataset_id": dataset_id,
            "profile": profile
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/v1/datasets/{dataset_id}")
@router.delete("/datasets/{dataset_id}")
def delete_dataset_endpoint(
    dataset_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Delete a company dataset and associated file safely.
    """
    dataset = db.query(CompanyDataset).filter(
        CompanyDataset.id == dataset_id,
        CompanyDataset.company_id == current_user.company_id
    ).first()

    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found or access denied.")

    db.delete(dataset)
    db.commit()
    return {"success": True, "message": f"Dataset #{dataset_id} deleted successfully."}
