"""rename events.metadata to event_metadata

Revision ID: 002
Revises: 001
Create Date: 2024-01-02 00:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade():
    # Rename column if it exists as 'metadata', skip if already 'event_metadata'
    conn = op.get_bind()
    result = conn.execute(sa.text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name='events' AND column_name='metadata'"
    ))
    if result.fetchone():
        op.alter_column('events', 'metadata', new_column_name='event_metadata')


def downgrade():
    conn = op.get_bind()
    result = conn.execute(sa.text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name='events' AND column_name='event_metadata'"
    ))
    if result.fetchone():
        op.alter_column('events', 'event_metadata', new_column_name='metadata')
