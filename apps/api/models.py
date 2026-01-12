# SQLAlchemy database models for privacy scan data.
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, BigInteger, Boolean, 
    Text, DateTime, ForeignKey, JSON
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from database import Base


class Scan(Base):
    # Main scan record tracking a privacy analysis of a URL.
    __tablename__ = "scans"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    url = Column(Text, nullable=False)
    final_url = Column(Text, nullable=True)
    base_domain = Column(Text, nullable=False)
    profile = Column(String(20), nullable=False)  # 'baseline' or 'strict'
    status = Column(String(20), nullable=False, default='queued')  # queued|running|completed|failed
    
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)
    
    http_status = Column(Integer, nullable=True)
    page_title = Column(Text, nullable=True)
    
    # Summary metrics
    total_requests = Column(Integer, default=0)
    total_bytes = Column(BigInteger, default=0)
    third_party_domains = Column(Integer, default=0)
    cookies_set = Column(Integer, default=0)
    localstorage_keys = Column(Integer, default=0)
    indexeddb_present = Column(Boolean, default=False)
    privacy_score = Column(Integer, default=0)
    
    error_message = Column(Text, nullable=True)
    
    # Relationships
    domain_aggregates = relationship("DomainAggregate", back_populates="scan", cascade="all, delete-orphan")
    cookies = relationship("Cookie", back_populates="scan", cascade="all, delete-orphan")
    storage_summary = relationship("StorageSummary", back_populates="scan", uselist=False, cascade="all, delete-orphan")
    artifacts = relationship("Artifact", back_populates="scan", cascade="all, delete-orphan")


class DomainAggregate(Base):
    # Aggregated statistics per domain contacted during a scan.
    __tablename__ = "domain_aggregates"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scan_id = Column(UUID(as_uuid=True), ForeignKey("scans.id"), nullable=False)
    
    domain = Column(Text, nullable=False)
    is_third_party = Column(Boolean, nullable=False)
    request_count = Column(Integer, nullable=False)
    bytes = Column(BigInteger, nullable=False)
    resource_breakdown = Column(JSON, nullable=False)  # {"script": 5, "image": 2, ...}
    
    scan = relationship("Scan", back_populates="domain_aggregates")


class Cookie(Base):
    # Individual cookies set during a scan.
    __tablename__ = "cookies"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scan_id = Column(UUID(as_uuid=True), ForeignKey("scans.id"), nullable=False)
    
    name = Column(Text, nullable=False)
    domain = Column(Text, nullable=False)
    path = Column(Text, nullable=False)
    expires_at = Column(DateTime, nullable=True)
    is_session = Column(Boolean, nullable=False)
    is_third_party = Column(Boolean, nullable=False)
    
    scan = relationship("Scan", back_populates="cookies")


class StorageSummary(Base):
    # Browser storage usage summary for a scan.
    __tablename__ = "storage_summary"
    
    scan_id = Column(UUID(as_uuid=True), ForeignKey("scans.id"), primary_key=True)
    
    localstorage_keys_count = Column(Integer, nullable=False)
    indexeddb_present = Column(Boolean, nullable=False)
    serviceworker_present = Column(Boolean, nullable=False)
    
    scan = relationship("Scan", back_populates="storage_summary")


class Artifact(Base):
    # References to raw artifacts stored in S3/MinIO.
    __tablename__ = "artifacts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scan_id = Column(UUID(as_uuid=True), ForeignKey("scans.id"), nullable=False)
    
    kind = Column(String(50), nullable=False)  # 'network_log'|'storage_dump'|'screenshot'
    uri = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    scan = relationship("Scan", back_populates="artifacts")
