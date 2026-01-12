# Initial schema
# Revision ID: 001
# Revises: 
# Create Date: 2026-01-12 13:00:00.000000

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create scans table
    op.create_table(
        'scans',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('url', sa.Text(), nullable=False),
        sa.Column('final_url', sa.Text(), nullable=True),
        sa.Column('base_domain', sa.Text(), nullable=False),
        sa.Column('profile', sa.String(length=20), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('finished_at', sa.DateTime(), nullable=True),
        sa.Column('http_status', sa.Integer(), nullable=True),
        sa.Column('page_title', sa.Text(), nullable=True),
        sa.Column('total_requests', sa.Integer(), nullable=True),
        sa.Column('total_bytes', sa.BigInteger(), nullable=True),
        sa.Column('third_party_domains', sa.Integer(), nullable=True),
        sa.Column('cookies_set', sa.Integer(), nullable=True),
        sa.Column('localstorage_keys', sa.Integer(), nullable=True),
        sa.Column('indexeddb_present', sa.Boolean(), nullable=True),
        sa.Column('privacy_score', sa.Integer(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_scans_status', 'scans', ['status'])
    op.create_index('ix_scans_created_at', 'scans', ['created_at'])
    
    # Create domain_aggregates table
    op.create_table(
        'domain_aggregates',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('scan_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('domain', sa.Text(), nullable=False),
        sa.Column('is_third_party', sa.Boolean(), nullable=False),
        sa.Column('request_count', sa.Integer(), nullable=False),
        sa.Column('bytes', sa.BigInteger(), nullable=False),
        sa.Column('resource_breakdown', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.ForeignKeyConstraint(['scan_id'], ['scans.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_domain_aggregates_scan_id', 'domain_aggregates', ['scan_id'])
    
    # Create cookies table
    op.create_table(
        'cookies',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('scan_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.Text(), nullable=False),
        sa.Column('domain', sa.Text(), nullable=False),
        sa.Column('path', sa.Text(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('is_session', sa.Boolean(), nullable=False),
        sa.Column('is_third_party', sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(['scan_id'], ['scans.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_cookies_scan_id', 'cookies', ['scan_id'])
    
    # Create storage_summary table
    op.create_table(
        'storage_summary',
        sa.Column('scan_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('localstorage_keys_count', sa.Integer(), nullable=False),
        sa.Column('indexeddb_present', sa.Boolean(), nullable=False),
        sa.Column('serviceworker_present', sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(['scan_id'], ['scans.id'], ),
        sa.PrimaryKeyConstraint('scan_id')
    )
    
    # Create artifacts table
    op.create_table(
        'artifacts',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('scan_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('kind', sa.String(length=50), nullable=False),
        sa.Column('uri', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['scan_id'], ['scans.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_artifacts_scan_id', 'artifacts', ['scan_id'])


def downgrade() -> None:
    op.drop_table('artifacts')
    op.drop_table('storage_summary')
    op.drop_table('cookies')
    op.drop_table('domain_aggregates')
    op.drop_table('scans')
