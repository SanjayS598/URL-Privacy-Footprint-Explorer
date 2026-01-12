import os
from datetime import datetime
from celery import Celery
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Configuration from environment
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://privacy_user:privacy_pass@localhost:5432/privacy_db")

# Celery app
celery_app = Celery("privacy_worker", broker=REDIS_URL, backend=REDIS_URL)
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)

# Database setup
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@celery_app.task(name="run_scan")
def run_scan(scan_id: str, strict_config: dict):
    # Step 1 implementation: Basic status updates only
    # Real scanning logic will be added in later steps
    # strict_config will be used in later steps for blocking third-party requests
    
    db = SessionLocal()
    try:
        # Update status to running
        db.execute(
            text("UPDATE scans SET status = :status, started_at = :started_at WHERE id = :id"),
            {"status": "running", "started_at": datetime.utcnow(), "id": scan_id}
        )
        db.commit()
        
        # Simulate work
        import time
        time.sleep(2)
        
        # Update status to completed
        db.execute(
            text("UPDATE scans SET status = :status, finished_at = :finished_at WHERE id = :id"),
            {"status": "completed", "finished_at": datetime.utcnow(), "id": scan_id}
        )
        db.commit()
        
        return {"scan_id": scan_id, "status": "completed"}
        
    except Exception as e:
        db.rollback()
        # Update status to failed
        db.execute(
            text("UPDATE scans SET status = :status, error_message = :error_message WHERE id = :id"),
            {"status": "failed", "error_message": str(e), "id": scan_id}
        )
        db.commit()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    # Start worker with: celery -A worker worker --loglevel=info
    pass
