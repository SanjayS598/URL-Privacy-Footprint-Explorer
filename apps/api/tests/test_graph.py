import pytest
from fastapi.testclient import TestClient
import uuid
from datetime import datetime

from main import app
from models import Scan
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
