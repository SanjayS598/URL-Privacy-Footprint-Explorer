import os
import json
import uuid
from datetime import datetime
from collections import defaultdict
from urllib.parse import urlparse
from celery import Celery
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
import tldextract

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
    # Step 3 implementation: Added network request interception
    # Collects all requests, tracks third-party domains, aggregates by domain
    # strict_config will be used in later steps for blocking third-party requests
    
    db = SessionLocal()
    try:
        # Get the URL and base domain from the database
        result = db.execute(
            text("SELECT url, base_domain FROM scans WHERE id = :id"),
            {"id": scan_id}
        )
        row = result.fetchone()
        if not row:
            raise ValueError(f"Scan {scan_id} not found")
        
        target_url = row[0]
        base_domain = row[1]
        
        # Update status to running
        db.execute(
            text("UPDATE scans SET status = :status, started_at = :started_at WHERE id = :id"),
            {"status": "running", "started_at": datetime.utcnow(), "id": scan_id}
        )
        db.commit()
        
        # Network tracking data structures
        requests_data = []
        domain_stats = defaultdict(lambda: {
            "request_count": 0,
            "bytes": 0,
            "is_third_party": False,
            "resource_breakdown": defaultdict(int)
        })
        
        # Launch Playwright browser
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                viewport={"width": 1920, "height": 1080},
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
            page = context.new_page()
            
            # Set up network request/response listeners
            def handle_request(request):
                requests_data.append({
                    "url": request.url,
                    "method": request.method,
                    "resource_type": request.resource_type,
                    "timestamp": datetime.utcnow()
                })
            
            def handle_response(response):
                # Find the matching request data
                for req in requests_data:
                    if req["url"] == response.url and "status" not in req:
                        req["status"] = response.status
                        req["size"] = 0
                        
                        # Try to get response size from headers
                        headers = response.headers
                        if "content-length" in headers:
                            try:
                                req["size"] = int(headers["content-length"])
                            except (ValueError, TypeError):
                                pass
                        
                        # Extract domain using tldextract
                        parsed = urlparse(response.url)
                        extracted = tldextract.extract(parsed.netloc)
                        domain = f"{extracted.domain}.{extracted.suffix}" if extracted.suffix else extracted.domain
                        
                        # Determine if third-party
                        is_third_party = domain != base_domain
                        
                        # Aggregate by domain
                        domain_stats[domain]["request_count"] += 1
                        domain_stats[domain]["bytes"] += req["size"]
                        domain_stats[domain]["is_third_party"] = is_third_party
                        domain_stats[domain]["resource_breakdown"][req["resource_type"]] += 1
                        break
            
            page.on("request", handle_request)
            page.on("response", handle_response)
            
            try:
                # Navigate to URL with 30 second timeout
                response = page.goto(target_url, wait_until="networkidle", timeout=30000)
                
                # Capture final URL after redirects
                final_url = page.url
                http_status = response.status if response else None
                page_title = page.title()
                
                # Step 4: Extract cookies from browser context
                cookies = context.cookies()
                cookies_set = len(cookies)
                
                # Calculate totals
                total_requests = len([r for r in requests_data if "status" in r])
                total_bytes = sum(domain_stats[d]["bytes"] for d in domain_stats)
                third_party_count = len([d for d in domain_stats if domain_stats[d]["is_third_party"]])
                
                # Update scan with captured data
                db.execute(
                    text("""UPDATE scans 
                            SET status = :status, 
                                final_url = :final_url,
                                http_status = :http_status,
                                page_title = :page_title,
                                total_requests = :total_requests,
                                total_bytes = :total_bytes,
                                third_party_domains = :third_party_domains,
                                cookies_set = :cookies_set,
                                finished_at = :finished_at 
                            WHERE id = :id"""),
                    {
                        "status": "completed",
                        "final_url": final_url,
                        "http_status": http_status,
                        "page_title": page_title,
                        "total_requests": total_requests,
                        "total_bytes": total_bytes,
                        "third_party_domains": third_party_count,
                        "cookies_set": cookies_set,
                        "finished_at": datetime.utcnow(),
                        "id": scan_id
                    }
                )
                db.commit()
                
                # Insert cookies into database
                for cookie in cookies:
                    # Parse expiration timestamp
                    expires_at = None
                    is_session = True
                    if "expires" in cookie and cookie["expires"] != -1:
                        # Playwright returns expires as Unix timestamp
                        expires_at = datetime.fromtimestamp(cookie["expires"])
                        is_session = False
                    
                    # Determine if third-party cookie
                    cookie_domain = cookie.get("domain", "").lstrip(".")
                    is_third_party = not cookie_domain.endswith(base_domain)
                    
                    db.execute(
                        text("""INSERT INTO cookies 
                                (id, scan_id, name, domain, path, expires_at, is_session, is_third_party)
                                VALUES (:id, :scan_id, :name, :domain, :path, :expires_at, :is_session, :is_third_party)"""),
                        {
                            "id": str(uuid.uuid4()),
                            "scan_id": scan_id,
                            "name": cookie.get("name", ""),
                            "domain": cookie.get("domain", ""),
                            "path": cookie.get("path", "/"),
                            "expires_at": expires_at,
                            "is_session": is_session,
                            "is_third_party": is_third_party
                        }
                    )
                db.commit()
                
                # Insert domain aggregates
                for domain, stats in domain_stats.items():
                    resource_json = json.dumps(dict(stats["resource_breakdown"]))
                    db.execute(
                        text("""INSERT INTO domain_aggregates 
                                (id, scan_id, domain, is_third_party, request_count, bytes, resource_breakdown)
                                VALUES (:id, :scan_id, :domain, :is_third_party, :request_count, :bytes, CAST(:resource_breakdown AS jsonb))"""),
                        {
                            "id": str(uuid.uuid4()),
                            "scan_id": scan_id,
                            "domain": domain,
                            "is_third_party": stats["is_third_party"],
                            "request_count": stats["request_count"],
                            "bytes": stats["bytes"],
                            "resource_breakdown": resource_json
                        }
                    )
                db.commit()
                
            except PlaywrightTimeoutError as e:
                raise Exception(f"Timeout loading page: {str(e)}")
            finally:
                browser.close()
        
        return {"scan_id": scan_id, "status": "completed", "total_requests": total_requests}
        
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
