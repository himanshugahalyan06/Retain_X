from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Query
from churnguard.services.uplift_service import UpliftService

router = APIRouter()
uplift_service = UpliftService()

@router.get("/v1/uplift/status")
@router.get("/uplift/status")
def get_uplift_status():
    return uplift_service.get_model_status()

@router.post("/v1/uplift/simulate")
@router.post("/uplift/simulate")
def run_uplift_simulation(
    num_customers: int = Query(default=500, ge=100, le=5000),
    control_ratio: float = Query(default=0.30, ge=0.10, le=0.50)
):
    try:
        return uplift_service.run_synthetic_simulation(
            num_customers=num_customers,
            control_ratio=control_ratio
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
