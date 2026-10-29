import os
import mlflow
import mlflow.sklearn

os.environ["MLFLOW_ALLOW_FILE_STORE"] = "true"

class MLflowLogger:

    def __init__(
        self,
        experiment_name: str,
        tracking_uri: str
    ):
        try:
            mlflow.set_tracking_uri(tracking_uri)
            mlflow.set_experiment(experiment_name)
        except Exception:
            # Fallback to local SQLite db backend
            fallback_uri = "sqlite:///mlruns.db"
            mlflow.set_tracking_uri(fallback_uri)
            mlflow.set_experiment(experiment_name)

    def log_model(
        self,
        model,
        metrics,
        params,
        artifacts=None,
        run_name: str = "v2_enriched_features"
    ):

        with mlflow.start_run(run_name=run_name):
            mlflow.log_params(params)
            mlflow.log_metrics(metrics)

            if artifacts:
                for name, path in artifacts.items():
                    mlflow.log_artifact(path)

            try:
                mlflow.sklearn.log_model(
                    sk_model=model,
                    artifact_path="model",
                    registered_model_name="ChurnGuardModel"
                )
            except Exception:
                mlflow.sklearn.log_model(
                    sk_model=model,
                    artifact_path="model"
                )