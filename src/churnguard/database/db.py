import os
import sqlite3
from pathlib import Path
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# -------------------------------
# Database Configuration
# -------------------------------
# Use PostgreSQL from env if available, otherwise SQLite fallback
BASE_DIR = Path(__file__).resolve().parents[3]
FALLBACK_DB = BASE_DIR / "churnguard.db"

if os.getenv("VERCEL") and not os.getenv("DATABASE_URL"):
    # In Vercel serverless functions, the root directory is read-only.
    # Copy bundled database to /tmp so SQLite write operations and journal locks succeed.
    import shutil
    TMP_DB = Path("/tmp/churnguard.db")
    if not TMP_DB.exists() and FALLBACK_DB.exists():
        try:
            shutil.copy2(FALLBACK_DB, TMP_DB)
        except Exception:
            pass
    DATABASE_URL = f"sqlite:///{TMP_DB}"
else:
    DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{FALLBACK_DB}")

# Normalize postgres URL schemes for SQLAlchemy 2.0 + psycopg2 compatibility
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
elif DATABASE_URL.startswith("postgresql://") and not DATABASE_URL.startswith("postgresql+"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False
)

def get_db():
    """
    Dependency for database sessions.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def sync_sqlite_columns():
    """
    Ensure SQLite tables contain multi-tenancy columns without requiring manual migrations.
    """
    if "sqlite" in DATABASE_URL:
        try:
            with engine.connect() as conn:
                tables = [
                    "customers", "predictions", "retention_decisions", "business_settings",
                    "campaigns", "campaign_assignments", "interventions", "intervention_outcomes",
                    "manager_logs", "prediction_logs", "customer_behavioral_data", "customer_crm_data",
                    "customer_support_data", "customer_payment_data"
                ]

                for table in tables:
                    try:
                        res = conn.execute(text(f"PRAGMA table_info({table})")).fetchall()
                        cols = [r[1] for r in res]
                        if cols and "company_id" not in cols:
                            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN company_id INTEGER"))
                            conn.commit()
                    except Exception:
                        pass
        except Exception:
            pass

sync_sqlite_columns()