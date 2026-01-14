# FastAPI application for Privacy Footprint Explorer API.
import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import tldextract

from database import get_db, engine
from models import Base, Scan, DomainAggregate, Cookie, StorageSummary, Artifact
from schemas import (
    ScanCreateRequest, ScanCreateResponse, ScanStatus, ScanReport,
    DomainAggregateResponse, CookieResponse, StorageSummaryResponse,
    ArtifactResponse, GraphResponse, GraphNode, GraphEdge,
    CompareRequest, CompareDelta, ScanListItem, FingerprintingDetectionResponse
)
from tasks import celery_app

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Privacy Footprint Explorer API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    # Health check endpoint.
    return {"status": "healthy", "service": "privacy-api"}


@app.post("/api/scans", response_model=ScanCreateResponse)
async def create_scans(request: ScanCreateRequest, db: Session = Depends(get_db)):
    # Create new privacy scan job(s).
    # Validates the URL, computes base domain, creates scan records,
    # and enqueues Celery tasks for each profile.
    # Extract base domain (eTLD+1)
    extracted = tldextract.extract(request.url)
    base_domain = f"{extracted.domain}.{extracted.suffix}"
    
    if not extracted.domain or not extracted.suffix:
        raise HTTPException(status_code=400, detail="Invalid URL: cannot extract domain")
    
    scan_ids = []
    
    for profile in request.profiles:
        # Create scan record
        scan = Scan(
            id=uuid.uuid4(),
            url=request.url,
            base_domain=base_domain,
            profile=profile,
            status='queued',
            created_at=datetime.utcnow()
        )
        
        db.add(scan)
        db.commit()
        db.refresh(scan)
        
        scan_ids.append(scan.id)
        
        # Enqueue Celery task
        strict_config_dict = request.strict_config.model_dump() if profile == 'strict' else {}
        celery_app.send_task(
            "run_scan",
            args=[str(scan.id), strict_config_dict]
        )
    
    return ScanCreateResponse(scan_ids=scan_ids)


@app.get("/api/scans/{scan_id}", response_model=ScanStatus)
async def get_scan_status(scan_id: uuid.UUID, db: Session = Depends(get_db)):
    # Get scan status and summary information.
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    return scan


@app.get("/api/scans/{scan_id}/report", response_model=ScanReport)
async def get_scan_report(scan_id: uuid.UUID, db: Session = Depends(get_db)):
    # Get complete scan report including aggregates, cookies, and artifacts.
    # Returns top 50 domains by bytes and top 50 cookies.
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    # Get domain aggregates (top 50 by bytes)
    domain_aggregates = (
        db.query(DomainAggregate)
        .filter(DomainAggregate.scan_id == scan_id)
        .order_by(DomainAggregate.bytes.desc())
        .limit(50)
        .all()
    )
    
    # Get cookies (top 50)
    cookies = (
        db.query(Cookie)
        .filter(Cookie.scan_id == scan_id)
        .limit(50)
        .all()
    )
    
    # Get storage summary
    storage_summary = (
        db.query(StorageSummary)
        .filter(StorageSummary.scan_id == scan_id)
        .first()
    )
    
    # Get artifacts
    artifacts = (
        db.query(Artifact)
        .filter(Artifact.scan_id == scan_id)
        .all()
    )
    
    # Get fingerprinting detections
    from models import FingerprintingDetection
    fingerprinting_detections = (
        db.query(FingerprintingDetection)
        .filter(FingerprintingDetection.scan_id == scan_id)
        .all()
    )
    
    return ScanReport(
        scan=ScanStatus.model_validate(scan),
        domain_aggregates=[DomainAggregateResponse.model_validate(d) for d in domain_aggregates],
        cookies=[CookieResponse.model_validate(c) for c in cookies],
        storage_summary=StorageSummaryResponse.model_validate(storage_summary) if storage_summary else None,
        artifacts=[ArtifactResponse.model_validate(a) for a in artifacts],
        fingerprinting_detections=[FingerprintingDetectionResponse.model_validate(f) for f in fingerprinting_detections]
    )


@app.get("/api/scans/{scan_id}/graph", response_model=GraphResponse)
async def get_scan_graph(scan_id: uuid.UUID, db: Session = Depends(get_db)):
    # Get graph visualization data for a scan.
    # Returns nodes (domains) and edges (relationships) with metrics.
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    # Get domain aggregates
    domain_aggregates = (
        db.query(DomainAggregate)
        .filter(DomainAggregate.scan_id == scan_id)
        .all()
    )
    
    # Get cookies grouped by domain
    cookies = (
        db.query(Cookie)
        .filter(Cookie.scan_id == scan_id)
        .all()
    )
    
    # Count cookies per domain
    cookies_by_domain = {}
    for cookie in cookies:
        extracted = tldextract.extract(cookie.domain)
        domain_key = f"{extracted.domain}.{extracted.suffix}"
        cookies_by_domain[domain_key] = cookies_by_domain.get(domain_key, 0) + 1
    
    # Load tracker list (for coloring nodes)
    tracker_domains = set()
    try:
        import json
        with open('/app/tracker_lists/default.json', 'r') as f:
            tracker_domains = set(json.load(f))
    except Exception:
        pass
    
    nodes = []
    edges = []
    
    # Add root node (base domain)
    root_node = GraphNode(
        id=scan.base_domain,
        domain=scan.base_domain,
        is_third_party=False,
        request_count=sum(d.request_count for d in domain_aggregates if not d.is_third_party),
        bytes=sum(d.bytes for d in domain_aggregates if not d.is_third_party),
        cookies_count=cookies_by_domain.get(scan.base_domain, 0),
        is_tracker=False
    )
    nodes.append(root_node)
    
    # Add third-party nodes
    for domain_agg in domain_aggregates:
        if domain_agg.is_third_party:
            node = GraphNode(
                id=domain_agg.domain,
                domain=domain_agg.domain,
                is_third_party=True,
                request_count=domain_agg.request_count,
                bytes=domain_agg.bytes,
                cookies_count=cookies_by_domain.get(domain_agg.domain, 0),
                is_tracker=domain_agg.domain in tracker_domains
            )
            nodes.append(node)
            
            # Create edge from root to third party
            edge = GraphEdge(
                source=scan.base_domain,
                target=domain_agg.domain
            )
            edges.append(edge)
    
    return GraphResponse(nodes=nodes, edges=edges)


@app.post("/api/compare", response_model=CompareDelta)
async def compare_scans(request: CompareRequest, db: Session = Depends(get_db)):
    # Compare two scans and return deltas.
    # Typically used to compare baseline vs strict mode scans.
    scan_a = db.query(Scan).filter(Scan.id == request.scan_a_id).first()
    scan_b = db.query(Scan).filter(Scan.id == request.scan_b_id).first()
    
    if not scan_a or not scan_b:
        raise HTTPException(status_code=404, detail="One or both scans not found")
    
    # Get domains for each scan
    domains_a = set(
        d.domain for d in 
        db.query(DomainAggregate).filter(
            DomainAggregate.scan_id == request.scan_a_id,
            DomainAggregate.is_third_party == True
        ).all()
    )
    
    domains_b = set(
        d.domain for d in 
        db.query(DomainAggregate).filter(
            DomainAggregate.scan_id == request.scan_b_id,
            DomainAggregate.is_third_party == True
        ).all()
    )
    
    # Get cookie counts
    cookies_a = db.query(Cookie).filter(Cookie.scan_id == request.scan_a_id).count()
    cookies_b = db.query(Cookie).filter(Cookie.scan_id == request.scan_b_id).count()
    
    # Calculate deltas
    domains_added = list(domains_b - domains_a)
    domains_removed = list(domains_a - domains_b)
    
    return CompareDelta(
        third_party_domains_delta=scan_b.third_party_domains - scan_a.third_party_domains,
        cookies_delta=scan_b.cookies_set - scan_a.cookies_set,
        bytes_delta=scan_b.total_bytes - scan_a.total_bytes,
        score_delta=scan_b.privacy_score - scan_a.privacy_score,
        domains_added=domains_added,
        domains_removed=domains_removed,
        cookies_added_count=max(0, cookies_b - cookies_a),
        cookies_removed_count=max(0, cookies_a - cookies_b)
    )


@app.get("/api/scans", response_model=List[ScanListItem])
async def list_scans(limit: int = 20, db: Session = Depends(get_db)):
    # List recent scans for history view.
    # Returns scans ordered by creation time (newest first).
    scans = (
        db.query(Scan)
        .order_by(Scan.created_at.desc())
        .limit(limit)
        .all()
    )
    
    return [ScanListItem.model_validate(s) for s in scans]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
