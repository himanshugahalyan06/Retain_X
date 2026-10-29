import pandas as pd
import json

from churnguard.preprocessing.pipeline import build_pipeline
from churnguard.models.predict import Predictor
from churnguard.config import SCHEMA_DIR

def test_encoding_consistency(tmp_path, monkeypatch):
    """
    Test that inference-time DataFrame has identical columns (name and order)
    to the training-time DataFrame, even with unseen categories in enriched fields.
    """
    # 1. Create a synthetic training dataset with Telco + Enriched fields
    train_data = pd.DataFrame({
        "Contract": ["Month-to-month", "One year", "Two year"],
        "lifecycle_stage": ["onboarding", "active", "at_risk"],
        "account_owner": ["Sarah Jenkins", "Alex Rivera", "David Kim"],
        "tenure": [12, 24, 36],
        "MonthlyCharges": [70.0, 85.0, 100.0],
        "login_frequency": [15.0, 20.0, 2.5],
        "total_tickets": [1, 0, 6],
        "failed_payments_count": [0, 0, 2]
    })
    
    # 2. Build the pipeline (simulating training time)
    monkeypatch.setattr("churnguard.preprocessing.pipeline.ENCODER_DIR", tmp_path)
    monkeypatch.setattr("churnguard.preprocessing.encoder.ENCODER_DIR", tmp_path)
    
    pipeline = build_pipeline(train_data)
    train_transformed = pipeline.transform(train_data)
    
    train_columns = pipeline.named_steps["preprocessor"].get_feature_names_out().tolist()
    
    # Save schema as happens in train.py
    schema_file = tmp_path / "feature_schema.json"
    with open(schema_file, "w") as f:
        json.dump(train_columns, f)

    # 3. Create a synthetic inference dataset with UNSEEN categories and missing fields
    inference_data = pd.DataFrame({
        "Contract": ["Month-to-month"],
        "lifecycle_stage": ["unseen_stage"], # UNSEEN!
        "account_owner": ["Unseen Agent"],   # UNSEEN!
        "tenure": [6],
        "MonthlyCharges": [90.0],
        "login_frequency": [5.0],
        "total_tickets": [3],
        "failed_payments_count": [1]
    })
    
    # 4. Transform inference data
    inference_transformed = pipeline.transform(inference_data)
    inference_df = pd.DataFrame(inference_transformed, columns=train_columns)
    
    # 5. Load schema and reindex (simulating predict.py)
    with open(schema_file) as f:
        loaded_schema = json.load(f)
        
    final_df = inference_df.reindex(columns=loaded_schema, fill_value=0)
    
    # 6. Assertions
    assert list(final_df.columns) == train_columns
    
    # The unseen lifecycle_stage and account_owner should be ignored (all one-hot columns are 0)
    unseen_stage_cols = [col for col in final_df.columns if col.startswith("categorical__lifecycle_stage")]
    for col in unseen_stage_cols:
        assert final_df[col].iloc[0] == 0.0

    # Numerical columns should be preserved accurately
    assert final_df["numerical__login_frequency"].iloc[0] == 5.0
    assert final_df["numerical__total_tickets"].iloc[0] == 3.0
    assert final_df["numerical__failed_payments_count"].iloc[0] == 1.0