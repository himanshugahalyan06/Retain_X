"""
API Dependencies
"""

from typing import Optional
from churnguard.models.predict import Predictor
from churnguard.database.db import SessionLocal, get_db

_predictor_instance: Optional[Predictor] = None

def get_predictor() -> Predictor:
    """
    Lazy singleton accessor for Predictor.
    """
    global _predictor_instance
    if _predictor_instance is None:
        _predictor_instance = Predictor()
    return _predictor_instance

# Global Predictor instance for backward compatibility
predictor = get_predictor()