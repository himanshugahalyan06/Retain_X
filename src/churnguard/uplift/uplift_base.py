from abc import ABC, abstractmethod
from typing import Dict, Any, List
import pandas as pd

class Treatment:
    """
    Represents an intervention action (treatment) applied to a customer.
    """
    def __init__(self, id: int, name: str, cost: float):
        self.id = id
        self.name = name
        self.cost = cost

class Control:
    """
    Represents the default state (no intervention/treatment) for comparison.
    """
    def __init__(self):
        self.name = "No Intervention"
        self.cost = 0.0

class Outcome:
    """
    Represents the response observed from a customer after treatment/control.
    """
    def __init__(self, customer_id: str, retained: bool, revenue_after: float):
        self.customer_id = customer_id
        self.retained = retained
        self.revenue_after = revenue_after

class UpliftModel(ABC):
    """
    Abstract interface for Uplift Modeling (Causal Machine Learning).
    
    Predicts the Individual Treatment Effect (ITE):
    Uplift Score = P(retained | Treatment) - P(retained | Control)
    """
    @abstractmethod
    def predict_treatment_probability(self, customer_features: pd.DataFrame, treatment: Treatment) -> float:
        """
        Estimate P(retained | customer_features, treatment)
        """
        pass

    @abstractmethod
    def predict_control_probability(self, customer_features: pd.DataFrame) -> float:
        """
        Estimate P(retained | customer_features, control)
        """
        pass

    def calculate_uplift_score(self, customer_features: pd.DataFrame, treatment: Treatment) -> float:
        """
        Calculate: Treatment Effect = P(retained | Treatment) - P(retained | Control)
        """
        p_treatment = self.predict_treatment_probability(customer_features, treatment)
        p_control = self.predict_control_probability(customer_features)
        return float(p_treatment - p_control)

    @abstractmethod
    def fit_uplift(self, training_data: pd.DataFrame, treatments: List[Treatment], outcomes: List[Outcome]) -> None:
        """
        Train the uplift model using treatment, control, and outcome data.
        """
        pass
