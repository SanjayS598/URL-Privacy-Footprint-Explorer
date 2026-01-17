import pytest
from fastapi.testclient import TestClient
import uuid
from datetime import datetime

from main import app
from models import Scan, DomainAggregate, Cookie
from database import get_db


def test_graph_endpoint_handles_empty_data():
    """Test graph endpoint with no domains or cookies."""
    from tests.conftest import TestingSessionLocal, Base, engine
    
    # Create test database
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    
    try:
        # Create a scan
        scan_id = uuid.uuid4()
        scan = Scan(
            id=scan_id,
            url="https://example.com",
            base_domain="example.com",
            profile="baseline",
            status="completed",
            created_at=datetime.utcnow()
        )
        session.add(scan)
        session.commit()
        
        # Override get_db dependency
        def override_get_db():
            try:
                yield session
            finally:
                pass
        
        app.dependency_overrides[get_db] = override_get_db
        
        # Test the endpoint
        with TestClient(app) as client:
            response = client.get(f"/api/scans/{scan_id}/graph")
            assert response.status_code == 200
            data = response.json()
            
            # Verify structure
            assert "nodes" in data
            assert "edges" in data
            assert isinstance(data["nodes"], list)
            assert isinstance(data["edges"], list)
            
            # Should have at least root node
            assert len(data["nodes"]) >= 1
            
            # Verify root node properties
            root_node = data["nodes"][0]
            assert root_node["domain"] == "example.com"
            assert root_node["is_third_party"] is False
            assert root_node["is_tracker"] is False
        
        app.dependency_overrides.clear()
        
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


def test_graph_endpoint_tracker_file_exception():
    """Test graph endpoint handles missing tracker file gracefully."""
    from fastapi.testclient import TestClient
    from tests.conftest import TestingSessionLocal, Base, engine
    
    # Create test database
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    
    try:
        # Create a scan
        scan_id = uuid.uuid4()
        scan = Scan(
            id=scan_id,
            url="https://example.com",
            base_domain="example.com",
            profile="baseline",
            status="completed",
            created_at=datetime.utcnow()
        )
        session.add(scan)
        session.commit()
        
        # Override get_db dependency
        def override_get_db():
            try:
                yield session
            finally:
                pass
        
        app.dependency_overrides[get_db] = override_get_db
        
        # Test the endpoint (tracker file won't exist, should handle gracefully)
        with TestClient(app) as client:
            response = client.get(f"/api/scans/{scan_id}/graph")
            assert response.status_code == 200
            data = response.json()
            
            # Should still work even without tracker file
            assert "nodes" in data
            assert "edges" in data
        
        app.dependency_overrides.clear()
        
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


def test_graph_endpoint_with_cookies_and_domains():
    """Test graph endpoint with cookies and third-party domains."""
    from tests.conftest import TestingSessionLocal, Base, engine
    
    # Create test database
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    
    try:
        # Create a scan
        scan_id = uuid.uuid4()
        scan = Scan(
            id=scan_id,
            url="https://example.com",
            base_domain="example.com",
            profile="baseline",
            status="completed",
            created_at=datetime.utcnow()
        )
        session.add(scan)
        session.flush()
        
        # Add domain aggregates (including third-party)
        domain1 = DomainAggregate(
            scan_id=scan_id,
            domain="example.com",
            is_third_party=False,
            request_count=10,
            bytes=50000,
            resource_breakdown={"script": 5, "image": 3, "xhr": 2}
        )
        domain2 = DomainAggregate(
            scan_id=scan_id,
            domain="tracker.com",
            is_third_party=True,
            request_count=5,
            bytes=10000,
            resource_breakdown={"script": 3, "xhr": 2}
        )
        domain3 = DomainAggregate(
            scan_id=scan_id,
            domain="analytics.net",
            is_third_party=True,
            request_count=3,
            bytes=5000,
            resource_breakdown={"script": 2, "xhr": 1}
        )
        session.add_all([domain1, domain2, domain3])
        
        # Add cookies for different domains
        cookie1 = Cookie(
            scan_id=scan_id,
            name="session",
            domain=".example.com",
            path="/",
            is_session=False,
            is_third_party=False
        )
        cookie2 = Cookie(
            scan_id=scan_id,
            name="tracking_id",
            domain=".tracker.com",
            path="/",
            is_session=False,
            is_third_party=True
        )
        cookie3 = Cookie(
            scan_id=scan_id,
            name="analytics",
            domain=".analytics.net",
            path="/",
            is_session=False,
            is_third_party=True
        )
        session.add_all([cookie1, cookie2, cookie3])
        session.commit()
        
        # Override get_db dependency
        def override_get_db():
            try:
                yield session
            finally:
                pass
        
        app.dependency_overrides[get_db] = override_get_db
        
        # Test the endpoint
        with TestClient(app) as client:
            response = client.get(f"/api/scans/{scan_id}/graph")
            assert response.status_code == 200
            data = response.json()
            
            # Verify structure
            assert "nodes" in data
            assert "edges" in data
            
            # Should have root + 2 third-party nodes
            assert len(data["nodes"]) == 3
            
            # Should have 2 edges (root -> tracker, root -> analytics)
            assert len(data["edges"]) == 2
            
            # Verify root node has cookie count
            root_node = next(n for n in data["nodes"] if n["domain"] == "example.com")
            assert root_node["is_third_party"] is False
            assert root_node["cookies_count"] == 1  # One cookie for example.com
            
            # Verify third-party nodes
            tracker_node = next(n for n in data["nodes"] if n["domain"] == "tracker.com")
            assert tracker_node["is_third_party"] is True
            assert tracker_node["cookies_count"] == 1  # One cookie for tracker.com
            
            analytics_node = next(n for n in data["nodes"] if n["domain"] == "analytics.net")
            assert analytics_node["is_third_party"] is True
            assert analytics_node["cookies_count"] == 1  # One cookie for analytics.net
            
            # Verify edges
            assert all(edge["source"] == "example.com" for edge in data["edges"])
            edge_targets = {edge["target"] for edge in data["edges"]}
            assert edge_targets == {"tracker.com", "analytics.net"}
        
        app.dependency_overrides.clear()
        
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


def test_graph_endpoint_scan_not_found():
    """Test graph endpoint with non-existent scan."""
    from tests.conftest import TestingSessionLocal, Base, engine
    
    # Create test database
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    
    try:
        # Override get_db dependency
        def override_get_db():
            try:
                yield session
            finally:
                pass
        
        app.dependency_overrides[get_db] = override_get_db
        
        # Test the endpoint with non-existent scan ID
        with TestClient(app) as client:
            fake_id = uuid.uuid4()
            response = client.get(f"/api/scans/{fake_id}/graph")
            assert response.status_code == 404
            data = response.json()
            assert "detail" in data
            assert data["detail"] == "Scan not found"
        
        app.dependency_overrides.clear()
        
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)
