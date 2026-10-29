"""
split.py

Split the cleaned dataset into training and testing sets.
"""

import pandas as pd
import logging
from typing import Tuple
from sklearn.model_selection import train_test_split

from churnguard.config import (
    TARGET_COLUMN,
    TEST_SIZE,
    RANDOM_STATE,
    PROCESSED_DATA_DIR,
)

logger = logging.getLogger(__name__)

def split_data(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series]:
    """
    Split dataset into train and test sets.

    Parameters
    ----------
    df : pd.DataFrame

    Returns
    -------
    X_train, X_test, y_train, y_test
    """
    logger.info("Starting train-test split.")

    X = df.drop(columns=[TARGET_COLUMN])
    y = df[TARGET_COLUMN]

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        stratify=y
    )

    train = X_train.copy()
    train[TARGET_COLUMN] = y_train

    test = X_test.copy()
    test[TARGET_COLUMN] = y_test

    logger.info(f"Saving train data to {PROCESSED_DATA_DIR / 'train.csv'}")
    train.to_csv(
        PROCESSED_DATA_DIR / "train.csv",
        index=False
    )

    logger.info(f"Saving test data to {PROCESSED_DATA_DIR / 'test.csv'}")
    test.to_csv(
        PROCESSED_DATA_DIR / "test.csv",
        index=False
    )

    logger.info("=" * 50)
    logger.info("Train Test Split Completed")
    logger.info("=" * 50)
    logger.info(f"Train Shape : {train.shape}")
    logger.info(f"Test Shape  : {test.shape}")
    logger.info("=" * 50)

    return X_train, X_test, y_train, y_test


def split_data_train_val_test(
    df: pd.DataFrame,
    val_size: float = 0.20,
    test_size: float = 0.20,
    random_state: int = RANDOM_STATE
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.Series, pd.Series, pd.Series]:
    """
    Split dataset into train, validation, and test sets using stratified sampling.

    Parameters
    ----------
    df : pd.DataFrame
    val_size : float
        Fraction of total data for validation set (default 0.20)
    test_size : float
        Fraction of total data for test set (default 0.20)
    random_state : int

    Returns
    -------
    X_train, X_val, X_test, y_train, y_val, y_test
    """
    logger.info("Starting train-val-test split (60/20/20 stratified).")

    X = df.drop(columns=[TARGET_COLUMN])
    y = df[TARGET_COLUMN]

    # First split off the test set
    X_temp, X_test, y_temp, y_test = train_test_split(
        X,
        y,
        test_size=test_size,
        random_state=random_state,
        stratify=y
    )

    # Calculate relative validation size from remaining data
    # E.g. 0.20 / (1.0 - 0.20) = 0.25 of temp set
    relative_val_size = val_size / (1.0 - test_size)

    X_train, X_val, y_train, y_val = train_test_split(
        X_temp,
        y_temp,
        test_size=relative_val_size,
        random_state=random_state,
        stratify=y_temp
    )

    train = X_train.copy()
    train[TARGET_COLUMN] = y_train

    val = X_val.copy()
    val[TARGET_COLUMN] = y_val

    test = X_test.copy()
    test[TARGET_COLUMN] = y_test

    logger.info(f"Saving train data to {PROCESSED_DATA_DIR / 'train.csv'}")
    train.to_csv(PROCESSED_DATA_DIR / "train.csv", index=False)

    logger.info(f"Saving val data to {PROCESSED_DATA_DIR / 'val.csv'}")
    val.to_csv(PROCESSED_DATA_DIR / "val.csv", index=False)

    logger.info(f"Saving test data to {PROCESSED_DATA_DIR / 'test.csv'}")
    test.to_csv(PROCESSED_DATA_DIR / "test.csv", index=False)

    logger.info("=" * 50)
    logger.info("Train-Val-Test Split Completed")
    logger.info("=" * 50)
    logger.info(f"Train Shape : {train.shape}")
    logger.info(f"Val Shape   : {val.shape}")
    logger.info(f"Test Shape  : {test.shape}")
    logger.info("=" * 50)

    return X_train, X_val, X_test, y_train, y_val, y_test