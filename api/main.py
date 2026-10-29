import sys
import os

_current_dir = os.path.dirname(os.path.abspath(__file__))
_root_dir = os.path.dirname(_current_dir)
_src_dir = os.path.join(_root_dir, "src")
if _root_dir not in sys.path:
    sys.path.insert(0, _root_dir)
if _src_dir not in sys.path:
    sys.path.insert(0, _src_dir)

from datetime import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from api.routes.health import router as health_router
from api.routes.auth import router as auth_router
from api.routes.predict import router as predict_router
from api.routes.metrics import router as metrics_router
from api.routes.explain import router as explain_router
from api.routes.retention import router as retention_router
from api.routes.campaigns import router as campaigns_router
from api.routes.uplift import router as uplift_router
from api.routes.simulate import router as simulate_router
from api.routes.batch import router as batch_router
from api.routes.analytics import router as analytics_router
from api.routes.datasets import router as datasets_router
from api.routes.training import router as training_router

from churnguard.database.db import engine
from churnguard.database.models import Base
from churnguard.database.seed import seed_db
from api.dependencies import get_predictor


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan manager: ensures tables exist, seeds default data,
    and initializes Predictor models once during startup.
    """
    # 1. Startup initialization
    try:
        Base.metadata.create_all(bind=engine)
        seed_db()
    except Exception as e:
        print(f"Warning: Database startup initialization: {e}")

    # Warm up predictor
    try:
        app.state.predictor = get_predictor()
    except Exception as e:
        print(f"Warning: Predictor warmup: {e}")

    yield
    # Shutdown cleanups if needed


app = FastAPI(
    title="RetainX AI Platform API",
    description="Cost-Sensitive Customer Retention Decision Intelligence Platform API",
    version="2.0.0",
    lifespan=lifespan
)

# Enable CORS for local dev and production frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=86400,
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


# Global Exception Handler for structured JSON error contracts
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "error": "INTERNAL_SERVER_ERROR",
            "message": str(exc),
            "request_path": request.url.path,
            "timestamp": datetime.utcnow().isoformat()
        }
    )

# Health & System
app.include_router(health_router, tags=["Health"])

# Authentication
app.include_router(auth_router, prefix="/api/auth", tags=["Auth"])
app.include_router(auth_router, prefix="/auth", tags=["Auth"])

# Prediction & Batch Ingestion
app.include_router(predict_router, tags=["Predict Root"])
app.include_router(predict_router, prefix="/api", tags=["Predict"])
app.include_router(batch_router, tags=["Batch Ingestion Root"])
app.include_router(batch_router, prefix="/api", tags=["Batch Ingestion"])

# Retention Decision Intelligence (Mounted with and without /api for full frontend compatibility)
app.include_router(retention_router, tags=["Retention Root"])
app.include_router(retention_router, prefix="/api", tags=["Retention"])

# Campaigns, Uplift, Explain, Metrics, Simulator
app.include_router(campaigns_router, prefix="/api", tags=["Campaigns"])
app.include_router(campaigns_router, tags=["Campaigns Root"])
app.include_router(uplift_router, prefix="/api", tags=["Uplift"])
app.include_router(uplift_router, tags=["Uplift Root"])
app.include_router(metrics_router, tags=["Metrics Root"])
app.include_router(metrics_router, prefix="/api", tags=["Metrics"])
app.include_router(explain_router, tags=["Explain Root"])
app.include_router(explain_router, prefix="/api", tags=["Explain"])
app.include_router(simulate_router, tags=["Simulate Root"])
app.include_router(simulate_router, prefix="/api", tags=["Simulate"])

# Dynamic Analytics & Visualization Engine
app.include_router(analytics_router, tags=["Analytics Root"])
app.include_router(analytics_router, prefix="/api", tags=["Analytics"])

# Company Dataset Management & Profiling
app.include_router(datasets_router, tags=["Datasets Root"])
app.include_router(datasets_router, prefix="/api", tags=["Datasets"])

# Company Model Training & Registry
app.include_router(training_router, tags=["Training Root"])
app.include_router(training_router, prefix="/api", tags=["Training"])