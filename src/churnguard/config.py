"""
Project Configuration
"""

import logging
import os
from pathlib import Path

# -------------------------------
# Logging Configuration
# -------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("churnguard")

# -------------------------------
# Base Directory
# -------------------------------

BASE_DIR = Path(__file__).resolve().parents[2]

# -------------------------------
# Data Paths
# -------------------------------

DATA_DIR = BASE_DIR / "data"

RAW_DATA_DIR = DATA_DIR / "raw"

PROCESSED_DATA_DIR = DATA_DIR / "processed"

# -------------------------------
# Artifact Paths
# -------------------------------

ARTIFACTS_DIR = BASE_DIR / "artifacts"

MODEL_DIR = ARTIFACTS_DIR / "model"

ENCODER_DIR = ARTIFACTS_DIR / "encoder"

SCHEMA_DIR = ARTIFACTS_DIR / "schema"

THRESHOLD_DIR = ARTIFACTS_DIR / "threshold"

SHAP_DIR = ARTIFACTS_DIR / "shap"

# -------------------------------
# Dataset
# -------------------------------

DATASET_NAME = "WA_Fn-UseC_-Telco-Customer-Churn.csv"

TARGET_COLUMN = "Churn"

ID_COLUMN = "customerID"

# -------------------------------
# Train Test Split
# -------------------------------

TEST_SIZE = 0.20

RANDOM_STATE = 42

# -------------------------------
# Cost Matrix
# -------------------------------

FALSE_NEGATIVE_COST = 5000

FALSE_POSITIVE_COST = 500

# -------------------------------
# Model
# -------------------------------

MODEL_NAME = "RandomForestClassifier"

N_ESTIMATORS = 200

MAX_DEPTH = None

# -------------------------------
# MLflow
# -------------------------------

MLFLOW_EXPERIMENT = "ChurnGuard"

MLFLOW_TRACKING_URI = os.getenv("MLFLOW_TRACKING_URI", "http://127.0.0.1:5000")

# -------------------------------
# Ensure Directories Exist
# -------------------------------

def ensure_directories():
    """
    Ensure all necessary directories exist.
    """
    directories = [
        RAW_DATA_DIR,
        PROCESSED_DATA_DIR,
        MODEL_DIR,
        ENCODER_DIR,
        SCHEMA_DIR,
        THRESHOLD_DIR,
        SHAP_DIR
    ]
    for directory in directories:
        try:
            directory.mkdir(parents=True, exist_ok=True)
        except OSError:
            pass
        
ensure_directories()