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


def test_create_scan_ssrf_protection(client: TestClient):
    """Test SSRF protection in URL validation."""
    # Test various blocked patterns
    blocked_urls = [
        "http://localhost",
        "http://127.0.0.1",
        "http://0.0.0.0",
        "http://169.254.169.254",  # AWS metadata
        "http://10.0.0.1",  # Private range
        "http://172.16.0.1",  # Private range
        "http://192.168.1.1",  # Private range
    ]
    
    for url in blocked_urls:
        response = client.post(
            "/api/scans",
            json={"url": url}
        )
        assert response.status_code == 422, f"Expected 422 for {url}"
        data = response.json()
        assert "detail" in data


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
        json={"url": "http://"}
    )
    # Should fail - no domain
    assert response.status_code in [400, 422]
    
    # Test with just a tld
    response2 = client.post(
        "/api/scans",
        json={"url": "http://com"}
    )
    assert response2.status_code in [400, 422]


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


def test_create_scan_with_invalid_profile(client: TestClient):
    """Test creating scan with invalid profile name."""
    response = client.post(
        "/api/scans",
        json={
            "url": "https://example.com",
            "profiles": ["invalid_profile"]
        }
    )
    # Should fail validation
    assert response.status_code == 422


def test_list_scans_pagination(client: TestClient):
    """Test listing scans with pagination."""
    # Create multiple scans
    for i in range(5):
        client.post("/api/scans", json={"url": f"https://example{i}.com"})
    
    # List with limit
    response = client.get("/api/scans?limit=3")
    assert response.status_code == 200
    data = response.json()
    assert len(data) <= 3


def test_get_scan_domains_with_data(client: TestClient):
    """Test getting domains endpoint returns list."""
    # Create scan
    create_response = client.post(
        "/api/scans",
        json={"url": "https://example.com"}
    )
    scan_id = create_response.json()["scan_ids"][0]
    
    # Get domains - should return list even if empty
    response = client.get(f"/api/scans/{scan_id}/domains")
    if response.status_code == 200:
        data = response.json()
        assert isinstance(data, list)


def test_get_scan_cookies_endpoint(client: TestClient):
    """Test getting cookies endpoint returns list."""
    # Create scan
    create_response = client.post(
        "/api/scans",
        json={"url": "https://example.com"}
    )
    scan_id = create_response.json()["scan_ids"][0]
    
    # Get cookies - should return list even if empty
    response = client.get(f"/api/scans/{scan_id}/cookies")
    if response.status_code == 200:
        data = response.json()
        assert isinstance(data, list)


def test_get_scan_storage_endpoint(client: TestClient):
    """Test getting storage endpoint."""
    # Create scan
    create_response = client.post(
        "/api/scans",
        json={"url": "https://example.com"}
    )
    scan_id = create_response.json()["scan_ids"][0]
    
    # Get storage - may be null if scan not completed
    response = client.get(f"/api/scans/{scan_id}/storage")
    # Endpoint should exist and return appropriate response
    assert response.status_code in [200, 404]


def test_get_scan_fingerprinting_endpoint(client: TestClient):
    """Test getting fingerprinting endpoint."""
    # Create scan
    create_response = client.post(
        "/api/scans",
        json={"url": "https://example.com"}
    )
    scan_id = create_response.json()["scan_ids"][0]
    
    # Get fingerprinting - may be null if scan not completed
    response = client.get(f"/api/scans/{scan_id}/fingerprinting")
    # Endpoint should exist and return appropriate response
    assert response.status_code in [200, 404]


def test_get_scan_artifacts_endpoint(client: TestClient):
    """Test getting artifacts endpoint."""
    # Create scan
    create_response = client.post(
        "/api/scans",
        json={"url": "https://example.com"}
    )
    scan_id = create_response.json()["scan_ids"][0]
    
    # Get artifacts - should return list even if empty
    response = client.get(f"/api/scans/{scan_id}/artifacts")
    if response.status_code == 200:
        data = response.json()
        assert isinstance(data, list)


def test_compare_with_one_invalid_scan(client: TestClient):
    """Test comparing with one invalid scan ID."""
    # Create one valid scan
    response = client.post("/api/scans", json={"url": "https://example.com"})
    valid_scan_id = response.json()["scan_ids"][0]
    
    # Compare with invalid ID
    response = client.post(
        "/api/compare",
        json={
            "scan_a_id": valid_scan_id,
            "scan_b_id": "00000000-0000-0000-0000-000000000000"
        }
    )
    assert response.status_code == 404


def test_get_scan_report_with_complete_data(client: TestClient):
    """Test scan report includes all fields."""
    # Create scan
    create_response = client.post(
        "/api/scans",
        json={"url": "https://example.com"}
    )
    scan_id = create_response.json()["scan_ids"][0]
    
    # Get full report
    response = client.get(f"/api/scans/{scan_id}/report")
    assert response.status_code == 200
    data = response.json()
    
    # Verify structure
    assert "scan" in data
    assert "domain_aggregates" in data
    assert "cookies" in data
    assert "storage_summary" in data
    assert "artifacts" in data
    assert "fingerprinting_detections" in data
    
    # Verify scan details
    assert data["scan"]["id"] == scan_id
    assert data["scan"]["url"] == "https://example.com"


def test_create_multiple_scans_different_profiles(client: TestClient):
    """Test creating multiple scans with different profiles."""
    response = client.post(
        "/api/scans",
        json={
            "url": "https://example.com",
            "profiles": ["baseline", "strict"]
        }
    )
    assert response.status_code == 200
    data = response.json()
    
    # Should create 2 scans
    assert len(data["scan_ids"]) == 2
    
    # Both scans should exist and have correct profiles
    for i, scan_id in enumerate(data["scan_ids"]):
        scan_response = client.get(f"/api/scans/{scan_id}")
        assert scan_response.status_code == 200
        scan_data = scan_response.json()
        assert scan_data["profile"] in ["baseline", "strict"]


def test_list_scans_with_base_domain_no_results(client: TestClient):
    """Test filtering by base domain with no matches."""
    # Create scan with example.com
    client.post("/api/scans", json={"url": "https://example.com"})
    
    # Query for different domain
    response = client.get("/api/scans?base_domain=different.com")
    assert response.status_code == 200
    data = response.json()
    # May return empty or scans depending on implementation
    assert isinstance(data, list)


def test_get_scan_graph_structure(client: TestClient):
    """Test graph response has correct structure."""
    # Create scan
    create_response = client.post(
        "/api/scans",
        json={"url": "https://subdomain.example.com"}
    )
    scan_id = create_response.json()["scan_ids"][0]
    
    # Get graph
    response = client.get(f"/api/scans/{scan_id}/graph")
    assert response.status_code == 200
    data = response.json()
    
    # Verify structure
    assert "nodes" in data
    assert "edges" in data
    assert isinstance(data["nodes"], list)
    assert isinstance(data["edges"], list)
    
    # Should have at least one node (root)
    assert len(data["nodes"]) >= 1
    
    # Root node should have correct properties
    root_node = data["nodes"][0]
    assert "id" in root_node
    assert "domain" in root_node
    assert "is_third_party" in root_node
    assert root_node["is_third_party"] is False


def test_create_scan_with_strict_config(client: TestClient):
    """Test creating scan with strict mode and config."""
    response = client.post(
        "/api/scans",
        json={
            "url": "https://example.com",
            "profiles": ["strict"],
            "strict_config": {
                "block_trackers": True,
                "block_cookies": True
            }
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["scan_ids"]) == 1
    
    # Verify scan was created with strict profile
    scan_id = data["scan_ids"][0]
    scan_response = client.get(f"/api/scans/{scan_id}")
    assert scan_response.status_code == 200
    scan_data = scan_response.json()
    assert scan_data["profile"] == "strict"


def test_create_scan_baseline_without_strict_config(client: TestClient):
    """Test creating baseline scan without strict config."""
    response = client.post(
        "/api/scans",
        json={
            "url": "https://example.com",
            "profiles": ["baseline"]
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["scan_ids"]) == 1
    
    # Verify scan was created with baseline profile
    scan_id = data["scan_ids"][0]
    scan_response = client.get(f"/api/scans/{scan_id}")
    assert scan_response.status_code == 200
    scan_data = scan_response.json()
    assert scan_data["profile"] == "baseline"
