import os
from datetime import datetime
from celery import Celery
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

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
    # Step 2 implementation: Added Playwright browser automation
    # Launches Chromium, navigates to URL, captures final URL after redirects
    # strict_config will be used in later steps for blocking third-party requests
    
    db = SessionLocal()
    try:
        # Get the URL from the database
        result = db.execute(
            text("SELECT url FROM scans WHERE id = :id"),
            {"id": scan_id}
        )
        row = result.fetchone()
        if not row:
            raise ValueError(f"Scan {scan_id} not found")
        
        target_url = row[0]
        
        # Update status to running
        db.execute(
            text("UPDATE scans SET status = :status, started_at = :started_at WHERE id = :id"),
            {"status": "running", "started_at": datetime.utcnow(), "id": scan_id}
        )
        db.commit()
        
        # Launch Playwright browser
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                viewport={"width": 1920, "height": 1080},
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
            page = context.new_page()
            
            try:
                # Navigate to URL with 30 second timeout
                response = page.goto(target_url, wait_until="networkidle", timeout=30000)
                
                # Capture final URL after redirects
                final_url = page.url
                http_status = response.status if response else None
                page_title = page.title()
                
                # Update scan with captured data
                db.execute(
                    text("""UPDATE scans 
                            SET status = :status, 
                                final_url = :final_url,
                                http_status = :http_status,
                                page_title = :page_title,
                                finished_at = :finished_at 
                            WHERE id = :id"""),
                    {
                        "status": "completed",
                        "final_url": final_url,
                        "http_status": http_status,
                        "page_title": page_title,
                        "finished_at": datetime.utcnow(),
                        "id": scan_id
                    }
                )
                db.commit()
                
            except PlaywrightTimeoutError as e:
                raise Exception(f"Timeout loading page: {str(e)}")
            finally:
                browser.close()
        
        return {"scan_id": scan_id, "status": "completed", "final_url": final_url}
        
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
