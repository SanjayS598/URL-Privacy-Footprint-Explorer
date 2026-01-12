# Pydantic schemas for API request and response validation.
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel, HttpUrl, field_validator


class StrictConfig(BaseModel):
    # Configuration for strict mode scanning.
    block_third_party: bool = False
    allowlist_domains: List[str] = []


class ScanCreateRequest(BaseModel):
    # Request to create new scan(s).
    url: str
    profiles: List[str] = ["baseline", "strict"]
    strict_config: StrictConfig = StrictConfig()
    
    @field_validator('url')
    @classmethod
    def validate_url(cls, v: str) -> str:
        # Validate URL is http/https and not localhost/private.
        if not v.startswith(('http://', 'https://')):
            raise ValueError('URL must start with http:// or https://')
        
        # Basic SSRF protection - block obvious localhost/private ranges
        lower_url = v.lower()
        blocked = ['localhost', '127.0.0.1', '0.0.0.0', '169.254', '10.', '172.16.', '192.168.']
        for blocked_pattern in blocked:
            if blocked_pattern in lower_url:
                raise ValueError(f'URL contains blocked pattern: {blocked_pattern}')
        
        return v
    
    @field_validator('profiles')
    @classmethod
    def validate_profiles(cls, v: List[str]) -> List[str]:
        # Validate profiles are valid.
        valid_profiles = {'baseline', 'strict'}
        for profile in v:
            if profile not in valid_profiles:
                raise ValueError(f'Invalid profile: {profile}. Must be one of {valid_profiles}')
        return v


class ScanCreateResponse(BaseModel):
    # Response from creating scans.
    scan_ids: List[UUID]


class ScanStatus(BaseModel):
    # Scan status and summary information.
    id: UUID
    url: str
    final_url: Optional[str]
    base_domain: str
    profile: str
    status: str
    
    created_at: datetime
    started_at: Optional[datetime]
    finished_at: Optional[datetime]
    
    http_status: Optional[int]
    page_title: Optional[str]
    
    total_requests: int
    total_bytes: int
    third_party_domains: int
    cookies_set: int
    localstorage_keys: int
    indexeddb_present: bool
    privacy_score: int
    
    error_message: Optional[str]
    
    class Config:
        from_attributes = True


class DomainAggregateResponse(BaseModel):
    # Domain aggregate statistics.
    domain: str
    is_third_party: bool
    request_count: int
    bytes: int
    resource_breakdown: Dict[str, int]
    
    class Config:
        from_attributes = True


class CookieResponse(BaseModel):
    # Cookie information.
    name: str
    domain: str
    path: str
    expires_at: Optional[datetime]
    is_session: bool
    is_third_party: bool
    
    class Config:
        from_attributes = True


class StorageSummaryResponse(BaseModel):
    # Storage usage summary.
    localstorage_keys_count: int
    indexeddb_present: bool
    serviceworker_present: bool
    
    class Config:
        from_attributes = True


class ArtifactResponse(BaseModel):
    # Artifact reference.
    kind: str
    uri: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class ScanReport(BaseModel):
    # Complete scan report.
    scan: ScanStatus
    domain_aggregates: List[DomainAggregateResponse]
    cookies: List[CookieResponse]
    storage_summary: Optional[StorageSummaryResponse]
    artifacts: List[ArtifactResponse]


class GraphNode(BaseModel):
    # Node in the privacy graph.
    id: str
    domain: str
    is_third_party: bool
    request_count: int
    bytes: int
    cookies_count: int
    is_tracker: bool = False


class GraphEdge(BaseModel):
    # Edge in the privacy graph.
    source: str
    target: str


class GraphResponse(BaseModel):
    # Graph visualization data.
    nodes: List[GraphNode]
    edges: List[GraphEdge]


class CompareRequest(BaseModel):
    # Request to compare two scans.
    scan_a_id: UUID
    scan_b_id: UUID


class CompareDelta(BaseModel):
    # Deltas between two scans.
    third_party_domains_delta: int
    cookies_delta: int
    bytes_delta: int
    score_delta: int
    
    domains_added: List[str]
    domains_removed: List[str]
    
    cookies_added_count: int
    cookies_removed_count: int


class ScanListItem(BaseModel):
    # Scan list item for history.
    id: UUID
    url: str
    base_domain: str
    profile: str
    status: str
    created_at: datetime
    privacy_score: int
    
    class Config:
        from_attributes = True
