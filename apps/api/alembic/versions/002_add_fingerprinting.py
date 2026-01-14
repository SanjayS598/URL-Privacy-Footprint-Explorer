# Add fingerprinting detections table
# Revision ID: 002
# Revises: 001
# Create Date: 2026-01-14 00:00:00.000000

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create fingerprinting_detections table
    op.create_table(
        'fingerprinting_detections',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('scan_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('technique', sa.String(length=50), nullable=False),
        sa.Column('domain', sa.Text(), nullable=False),
        sa.Column('script_url', sa.Text(), nullable=True),
        sa.Column('evidence', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('severity', sa.String(length=20), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['scan_id'], ['scans.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_fingerprinting_detections_scan_id'), 'fingerprinting_detections', ['scan_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_fingerprinting_detections_scan_id'), table_name='fingerprinting_detections')
    op.drop_table('fingerprinting_detections')
