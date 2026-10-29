"""
Comprehensive Integration Tests for Dataset Management, Profiling,
Company-Specific Model Training, Multi-Algorithm Benchmarking, Registry,
and Tenant Isolation.
"""

import io
import time
import pytest
import pandas as pd
import numpy as np
from fastapi.testclient import TestClient

from api.main import app
from churnguard.database.db import SessionLocal
from churnguard.database.models import User, Company, CompanyDataset, CompanyTrainingJob, CompanyModel
from churnguard.services.dataset_service import save_and_inspect_dataset, profile_dataset
from churnguard.services.training_service import (
    start_company_training_job,
    _run_training_job_worker,
    activate_company_model,
    get_active_company_predictor
)

client = TestClient(app)


@pytest.fixture
def test_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def sample_churn_csv():
    """Generate a clean synthetic customer churn dataset for tests."""
    np.random.seed(42)
    n = 120
    data = {
        "customer_id": [f"TEST-{1000 + i}" for i in range(n)],
        "gender": np.random.choice(["Male", "Female"], n),
        "tenure": np.random.randint(1, 72, n),
        "MonthlyCharges": np.random.uniform(20.0, 110.0, n).round(2),
        "TotalCharges": np.random.uniform(50.0, 7000.0, n).round(2),
        "Contract": np.random.choice(["Month-to-month", "One year", "Two year"], n, p=[0.55, 0.25, 0.20]),
        "PaymentMethod": np.random.choice(["Electronic check", "Mailed check", "Bank transfer"], n),
        "Churn": np.random.choice(["Yes", "No"], n, p=[0.30, 0.70])
    }
    df = pd.DataFrame(data)
    csv_bytes = df.to_csv(index=False).encode('utf-8')
    return csv_bytes


def test_dataset_upload_and_profiling(test_db, sample_churn_csv):
    """Test tenant-isolated dataset save, schema extraction, and dynamic profiling."""
    company_id = 1
    dataset = save_and_inspect_dataset(
        company_id=company_id,
        file_bytes=sample_churn_csv,
        filename="customers_upload.csv",
        db=test_db
    )

    assert dataset.id is not None
    assert dataset.company_id == company_id
    assert dataset.row_count == 120
    assert dataset.col_count == 8
    assert dataset.target_column == "Churn"

    # Profile the dataset with Churn as target
    profile = profile_dataset(
        dataset_id=dataset.id,
        company_id=company_id,
        target_column="Churn",
        positive_class="Yes",
        db=test_db
    )

    assert profile["row_count"] == 120
    assert profile["target_column"] == "Churn"
    assert profile["target_profile"] is not None
    assert profile["target_profile"]["positive_rate"] > 0
    assert len(profile["numerical_summaries"]) > 0
    assert len(profile["churn_by_categorical"]) > 0
    assert "correlation_heatmap" in profile
    assert len(profile["correlation_heatmap"]["columns"]) > 0


def test_training_pipeline_and_model_registry(test_db, sample_churn_csv):
    """Test end-to-end model training, candidate benchmarking, calibration, test evaluation, and activation."""
    company_id = 1
    dataset = save_and_inspect_dataset(
        company_id=company_id,
        file_bytes=sample_churn_csv,
        filename="train_benchmark.csv",
        db=test_db
    )

    job_id = start_company_training_job(
        company_id=company_id,
        dataset_id=dataset.id,
        target_column="Churn",
        positive_class="Yes",
        db=test_db
    )

    assert job_id is not None

    # Wait synchronously for training worker to complete (usually < 2 seconds for 120 rows)
    max_wait = 15
    start_time = time.time()
    while time.time() - start_time < max_wait:
        job = test_db.query(CompanyTrainingJob).filter(CompanyTrainingJob.id == job_id).first()
        if job and job.status in ["COMPLETED", "FAILED"]:
            break
        time.sleep(0.3)
        test_db.expire_all()

    assert job is not None
    assert job.status == "COMPLETED", f"Training failed with error: {job.error_message}"
    assert job.best_algorithm is not None
    assert len(job.algorithms_evaluated) >= 3

    # Check generated model in registry
    model = test_db.query(CompanyModel).filter(
        CompanyModel.job_id == job_id,
        CompanyModel.company_id == company_id
    ).first()

    assert model is not None
    assert model.test_metrics is not None
    assert "roc_auc" in model.test_metrics
    assert "confusion_matrix" in model.test_metrics
    assert model.evaluation_curves is not None
    assert "roc_curve" in model.evaluation_curves
    assert "pr_curve" in model.evaluation_curves
    assert len(model.feature_importance) > 0

    # Test Model Activation
    activated = activate_company_model(company_id=company_id, model_id=model.id, db=test_db)
    assert activated.is_active is True

    # Test runtime predictor retrieval
    predictor_bundle = get_active_company_predictor(company_id=company_id, db=test_db)
    assert predictor_bundle is not None
    assert predictor_bundle["model_id"] == model.id
    assert predictor_bundle["algorithm"] == model.algorithm

    # Clean up test model activation and cache so subsequent tests are not affected
    test_db.query(CompanyModel).filter(CompanyModel.company_id == company_id).delete()
    test_db.query(CompanyTrainingJob).filter(CompanyTrainingJob.company_id == company_id).delete()
    test_db.commit()
    from churnguard.services.training_service import ACTIVE_COMPANY_PREDICTORS
    if company_id in ACTIVE_COMPANY_PREDICTORS:
        del ACTIVE_COMPANY_PREDICTORS[company_id]


def test_tenant_isolation_datasets_and_models(test_db, sample_churn_csv):
    """Ensure Company A cannot access, view, or activate Company B's datasets or models."""
    company_a_id = 1
    company_b_id = 2

    # Save dataset for Company A
    ds_a = save_and_inspect_dataset(
        company_id=company_a_id,
        file_bytes=sample_churn_csv,
        filename="company_a_data.csv",
        db=test_db
    )

    # Attempt to profile Company A's dataset using Company B's tenant context
    with pytest.raises(ValueError, match="Dataset not found or access denied"):
        profile_dataset(
            dataset_id=ds_a.id,
            company_id=company_b_id,
            target_column="Churn",
            db=test_db
        )

    # Attempt to launch training on Company A's dataset using Company B's tenant context
    with pytest.raises(ValueError, match="Dataset not found or access denied"):
        start_company_training_job(
            company_id=company_b_id,
            dataset_id=ds_a.id,
            target_column="Churn",
            db=test_db
        )


def test_invalid_positive_class_validation_and_clean_error(test_db, sample_churn_csv):
    """Ensure invalid positive class raises immediate, helpful validation error instead of crashing worker."""
    company_id = 1
    ds = save_and_inspect_dataset(
        company_id=company_id,
        file_bytes=sample_churn_csv,
        filename="company_test_data.csv",
        db=test_db
    )

    # Passing '10' when dataset has 'Yes' and 'No' must raise clear ValueError
    with pytest.raises(ValueError, match="does not exist in target column"):
        start_company_training_job(
            company_id=company_id,
            dataset_id=ds.id,
            target_column="Churn",
            positive_class="10",
            db=test_db
        )
