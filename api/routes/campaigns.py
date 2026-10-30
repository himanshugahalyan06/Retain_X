from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from api.dependencies import get_db
from api.schemas import CampaignCreateRequest
from churnguard.services.campaign_service import CampaignService
from churnguard.database.models import Campaign, User
from churnguard.auth.dependencies import get_current_active_user, require_manager

router = APIRouter()

@router.get("/v1/campaigns")
@router.get("/campaigns")
def list_campaigns(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    service = CampaignService(db_session=db)
    campaigns = db.query(Campaign).filter(Campaign.company_id == current_user.company_id).all()
    if not campaigns:
        return []
    return [service.get_campaign_analytics(c.id, company_id=current_user.company_id) for c in campaigns]

@router.post("/v1/campaigns")
@router.post("/campaigns")
def create_campaign(
    req: CampaignCreateRequest,
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db)
):
    service = CampaignService(db_session=db)
    try:
        camp = service.create_campaign(
            name=req.name,
            description=req.description,
            objective=req.objective,
            target_segment=req.target_segment,
            budget=req.budget,
            treatment_pct=req.treatment_pct,
            control_pct=req.control_pct,
            company_id=current_user.company_id
        )
        return camp
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/v1/campaigns/{id}/launch")
@router.post("/campaigns/{id}/launch")
def launch_campaign(
    id: int,
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db)
):
    service = CampaignService(db_session=db)
    try:
        return service.launch_campaign(id, company_id=current_user.company_id)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/v1/campaigns/{id}/analytics")
@router.get("/campaigns/{id}/analytics")
def get_campaign_analytics(
    id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    service = CampaignService(db_session=db)
    try:
        return service.get_campaign_analytics(id, company_id=current_user.company_id)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

