import pytest
from fastapi.testclient import TestClient


def test_health_check(client: TestClient):
    """Test health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "privacy-api"


def test_create_scan_valid_url(client: TestClient):
    """Test creating a scan with a valid URL."""
    response = client.post(
        "/api/scans",
        json={"url": "https://example.com"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "scan_ids" in data
    assert len(data["scan_ids"]) > 0


def test_create_scan_invalid_url(client: TestClient):
    """Test creating a scan with an invalid URL."""
    response = client.post(
        "/api/scans",
        json={"url": "not-a-valid-url"}
    )
    assert response.status_code == 422  # FastAPI validation error


def test_get_scan_not_found(client: TestClient):
    """Test getting a non-existent scan."""
    response = client.get("/api/scans/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404


def test_list_scans_empty(client: TestClient):
    """Test listing scans when none exist."""
    response = client.get("/api/scans")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 0


def test_create_and_get_scan(client: TestClient):
    """Test creating a scan and retrieving it."""
    # Create scan
    create_response = client.post(
        "/api/scans",
        json={"url": "https://example.com"}
    )
    assert create_response.status_code == 200
    scan_id = create_response.json()["scan_ids"][0]
    
    # Get scan
    get_response = client.get(f"/api/scans/{scan_id}")
    assert get_response.status_code == 200
    data = get_response.json()
    assert data["id"] == scan_id
    assert data["url"] == "https://example.com"
    assert data["status"] in ["queued", "running", "completed", "failed"]


def test_list_scans_after_creation(client: TestClient):
    """Test listing scans after creating some."""
    # Create two scans
    client.post("/api/scans", json={"url": "https://example.com"})
    client.post("/api/scans", json={"url": "https://test.com"})
    
    # List scans
    response = client.get("/api/scans")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 2


def test_get_scan_domains(client: TestClient):
    """Test getting domain aggregates for a scan."""
    # Create scan
    create_response = client.post(
        "/api/scans",
        json={"url": "https://example.com"}
    )
    scan_id = create_response.json()["scan_ids"][0]
    
    # Get domains - endpoint may return 404 for queued scans
    response = client.get(f"/api/scans/{scan_id}/domains")
    assert response.status_code in [200, 404]


def test_get_scan_cookies(client: TestClient):
    """Test getting cookies for a scan."""
    # Create scan
    create_response = client.post(
        "/api/scans",
        json={"url": "https://example.com"}
    )
    scan_id = create_response.json()["scan_ids"][0]
    
    # Get cookies - endpoint may return 404 for queued scans
    response = client.get(f"/api/scans/{scan_id}/cookies")
    assert response.status_code in [200, 404]


def test_get_scan_graph(client: TestClient):
    """Test getting graph data for a scan."""
    # Create scan
    create_response = client.post(
        "/api/scans",
        json={"url": "https://example.com"}
    )
    scan_id = create_response.json()["scan_ids"][0]
    
    # Get graph
    response = client.get(f"/api/scans/{scan_id}/graph")
    assert response.status_code == 200
    data = response.json()
    assert "nodes" in data
    assert "edges" in data
    assert isinstance(data["nodes"], list)
    assert isinstance(data["edges"], list)


def test_compare_scans_invalid_ids(client: TestClient):
    """Test comparing scans with invalid IDs."""
    response = client.get(
        "/api/scans/compare",
        params={
            "scan_id_1": "00000000-0000-0000-0000-000000000000",
            "scan_id_2": "00000000-0000-0000-0000-000000000001"
        }
    )
    assert response.status_code in [404, 422]  # 404 or validation error


def test_get_scan_report(client: TestClient):
    """Test getting full scan report."""
    # Create scan
    create_response = client.post(
        "/api/scans",
        json={"url": "https://example.com"}
    )
    scan_id = create_response.json()["scan_ids"][0]
    
    # Get report
    response = client.get(f"/api/scans/{scan_id}/report")
    assert response.status_code == 200
    data = response.json()
    assert "scan" in data
    assert "domain_aggregates" in data
    assert "cookies" in data
    assert isinstance(data["domain_aggregates"], list)
    assert isinstance(data["cookies"], list)


def test_get_scan_report_not_found(client: TestClient):
    """Test getting report for non-existent scan."""
    response = client.get("/api/scans/00000000-0000-0000-0000-000000000000/report")
    assert response.status_code == 404


def test_get_scan_storage(client: TestClient):
    """Test getting storage summary for a scan."""
    # Create scan
    create_response = client.post(
        "/api/scans",
        json={"url": "https://example.com"}
    )
    scan_id = create_response.json()["scan_ids"][0]
    
    # Get storage
    response = client.get(f"/api/scans/{scan_id}/storage")
    assert response.status_code in [200, 404]  # 404 if not completed


def test_get_scan_fingerprinting(client: TestClient):
    """Test getting fingerprinting detection for a scan."""
    # Create scan
    create_response = client.post(
        "/api/scans",
        json={"url": "https://example.com"}
    )
    scan_id = create_response.json()["scan_ids"][0]
    
    # Get fingerprinting
    response = client.get(f"/api/scans/{scan_id}/fingerprinting")
    assert response.status_code in [200, 404]  # 404 if not completed


def test_compare_valid_scans(client: TestClient):
    """Test comparing two valid scans."""
    # Create two scans
    response1 = client.post("/api/scans", json={"url": "https://example.com"})
    scan_id_1 = response1.json()["scan_ids"][0]
    
    response2 = client.post("/api/scans", json={"url": "https://test.com"})
    scan_id_2 = response2.json()["scan_ids"][0]
    
    # Compare them
    response = client.post(
        "/api/compare",
        json={
            "scan_a_id": scan_id_1,
            "scan_b_id": scan_id_2
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "third_party_domains_delta" in data
    assert "cookies_delta" in data
    assert "score_delta" in data


def test_list_scans_by_base_domain(client: TestClient):
    """Test filtering scans by base domain."""
    # Create scan
    client.post("/api/scans", json={"url": "https://example.com"})
    
    # List with base_domain filter
    response = client.get("/api/scans?base_domain=example.com")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_create_scan_extracts_base_domain(client: TestClient):
    """Test that base domain is correctly extracted from URL."""
    response = client.post(
        "/api/scans",
        json={"url": "https://subdomain.example.com/path?query=1"}
    )
    assert response.status_code == 200
    data = response.json()
    scan_id = data["scan_ids"][0]
    
    # Get scan and check base_domain
    scan_response = client.get(f"/api/scans/{scan_id}")
    scan_data = scan_response.json()
    assert scan_data["base_domain"] == "example.com"


def test_get_scan_artifacts(client: TestClient):
    """Test getting artifacts for a scan."""
    # Create scan
    create_response = client.post(
        "/api/scans",
        json={"url": "https://example.com"}
    )
    scan_id = create_response.json()["scan_ids"][0]
    
    # Get artifacts
    response = client.get(f"/api/scans/{scan_id}/artifacts")
    assert response.status_code in [200, 404]


def test_create_scan_with_custom_profiles(client: TestClient):
    """Test creating scan with custom profiles."""
    response = client.post(
        "/api/scans",
        json={
            "url": "https://example.com",
            "profiles": ["baseline", "strict"]
        }
    )
    assert response.status_code == 200
    data = response.json()
    # Should create 2 scans (one for each profile)
    assert len(data["scan_ids"]) == 2


def test_create_scan_invalid_domain(client: TestClient):
    """Test creating scan with URL that has no valid domain."""
    response = client.post(
        "/api/scans",
        json={"url": "http://localhost"}
    )
    # FastAPI validation or domain extraction error
    assert response.status_code in [400, 422]


def test_get_scan_graph_with_tracker_detection(client: TestClient):
    """Test graph endpoint returns proper structure."""
    # Create scan
    create_response = client.post(
        "/api/scans",
        json={"url": "https://example.com"}
    )
    scan_id = create_response.json()["scan_ids"][0]
    
    # Get graph
    response = client.get(f"/api/scans/{scan_id}/graph")
    assert response.status_code == 200
    data = response.json()
    assert "nodes" in data
    assert "edges" in data
    # Should have at least root node
    assert len(data["nodes"]) >= 1
    # Root node should be the base domain
    if data["nodes"]:
        root_node = data["nodes"][0]
        assert "domain" in root_node
        assert "is_third_party" in root_node
        assert root_node["is_third_party"] is False


def test_compare_same_scan(client: TestClient):
    """Test comparing a scan with itself."""
    # Create scan
    response = client.post("/api/scans", json={"url": "https://example.com"})
    scan_id = response.json()["scan_ids"][0]
    
    # Compare with itself
    response = client.post(
        "/api/compare",
        json={
            "scan_a_id": scan_id,
            "scan_b_id": scan_id
        }
    )
    assert response.status_code == 200
    data = response.json()
    # Deltas should all be zero
    assert data["third_party_domains_delta"] == 0
    assert data["cookies_delta"] == 0
    assert data["score_delta"] == 0
