"""initial migration

Revision ID: 001
Revises: 
Create Date: 2024-01-01 00:00:00

"""
from alembic import op
import sqlalchemy as sa

revision = '001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table('users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('full_name', sa.String(), nullable=False),
        sa.Column('hashed_password', sa.String(), nullable=False),
        sa.Column('role', sa.String(), nullable=False),
        sa.Column('company', sa.String()),
        sa.Column('phone', sa.String()),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True)),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_users_id', 'users', ['id'])
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    op.create_table('checkpoints',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('code', sa.String(), nullable=False),
        sa.Column('type', sa.String(), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('capacity', sa.Integer(), nullable=False, server_default='50'),
        sa.Column('current_load', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('status', sa.String(), nullable=False, server_default='operational'),
        sa.Column('avg_wait_minutes', sa.Float(), server_default='30.0'),
        sa.Column('efficiency_score', sa.Float(), server_default='85.0'),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_checkpoints_id', 'checkpoints', ['id'])
    op.create_unique_constraint('uq_checkpoints_code', 'checkpoints', ['code'])

    op.create_table('vehicles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('plate_number', sa.String(), nullable=False),
        sa.Column('vehicle_type', sa.String(), nullable=False),
        sa.Column('capacity_tons', sa.Float(), nullable=False),
        sa.Column('driver_id', sa.Integer(), sa.ForeignKey('users.id')),
        sa.Column('current_checkpoint_id', sa.Integer(), sa.ForeignKey('checkpoints.id')),
        sa.Column('status', sa.String(), server_default='idle'),
        sa.Column('latitude', sa.Float()),
        sa.Column('longitude', sa.Float()),
        sa.Column('last_seen', sa.DateTime(timezone=True)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_vehicles_id', 'vehicles', ['id'])
    op.create_unique_constraint('uq_vehicles_plate', 'vehicles', ['plate_number'])

    op.create_table('orders',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('order_number', sa.String(), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('company', sa.String(), nullable=False),
        sa.Column('cargo_type', sa.String(), nullable=False),
        sa.Column('cargo_weight', sa.Float(), nullable=False),
        sa.Column('origin', sa.String(), nullable=False),
        sa.Column('destination', sa.String(), nullable=False),
        sa.Column('origin_checkpoint_id', sa.Integer(), sa.ForeignKey('checkpoints.id')),
        sa.Column('dest_checkpoint_id', sa.Integer(), sa.ForeignKey('checkpoints.id')),
        sa.Column('desired_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('status', sa.String(), server_default='created'),
        sa.Column('vehicle_id', sa.Integer(), sa.ForeignKey('vehicles.id')),
        sa.Column('slot_id', sa.Integer()),
        sa.Column('estimated_arrival', sa.DateTime(timezone=True)),
        sa.Column('actual_arrival', sa.DateTime(timezone=True)),
        sa.Column('delay_minutes', sa.Integer(), server_default='0'),
        sa.Column('notes', sa.Text()),
        sa.Column('ai_extracted', sa.Boolean(), server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True)),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_orders_id', 'orders', ['id'])
    op.create_unique_constraint('uq_orders_number', 'orders', ['order_number'])

    op.create_table('slots',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('checkpoint_id', sa.Integer(), sa.ForeignKey('checkpoints.id'), nullable=False),
        sa.Column('slot_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('slot_date', sa.String(), nullable=False),
        sa.Column('duration_minutes', sa.Integer(), server_default='30'),
        sa.Column('status', sa.String(), server_default='available'),
        sa.Column('booking_number', sa.String()),
        sa.Column('qr_code_path', sa.String()),
        sa.Column('vehicle_type', sa.String()),
        sa.Column('order_id', sa.Integer(), sa.ForeignKey('orders.id')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('expires_at', sa.DateTime(timezone=True)),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_slots_id', 'slots', ['id'])

    op.create_table('notifications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id')),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('type', sa.String(), server_default='info'),
        sa.Column('is_read', sa.Boolean(), server_default='false'),
        sa.Column('related_order_id', sa.Integer()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table('events',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('event_type', sa.String(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.Text()),
        sa.Column('checkpoint_id', sa.Integer(), sa.ForeignKey('checkpoints.id')),
        sa.Column('order_id', sa.Integer(), sa.ForeignKey('orders.id')),
        sa.Column('severity', sa.String(), server_default='info'),
        sa.Column('metadata', sa.JSON()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table('predictions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('checkpoint_id', sa.Integer(), sa.ForeignKey('checkpoints.id'), nullable=False),
        sa.Column('predicted_wait_minutes', sa.Float(), nullable=False),
        sa.Column('predicted_congestion', sa.Float(), nullable=False),
        sa.Column('risk_score', sa.Float(), nullable=False),
        sa.Column('features_used', sa.JSON()),
        sa.Column('valid_for', sa.DateTime(timezone=True)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table('simulations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('scenario', sa.String(), nullable=False),
        sa.Column('status', sa.String(), server_default='pending'),
        sa.Column('parameters', sa.JSON()),
        sa.Column('results', sa.JSON()),
        sa.Column('impact_summary', sa.Text()),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('users.id')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('completed_at', sa.DateTime(timezone=True)),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table('audit_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id')),
        sa.Column('order_id', sa.Integer(), sa.ForeignKey('orders.id')),
        sa.Column('action', sa.String(), nullable=False),
        sa.Column('entity_type', sa.String()),
        sa.Column('entity_id', sa.Integer()),
        sa.Column('old_value', sa.JSON()),
        sa.Column('new_value', sa.JSON()),
        sa.Column('ip_address', sa.String()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table('weather_conditions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('checkpoint_id', sa.Integer(), sa.ForeignKey('checkpoints.id')),
        sa.Column('condition', sa.String(), nullable=False),
        sa.Column('severity', sa.Integer(), server_default='0'),
        sa.Column('temperature', sa.Float()),
        sa.Column('wind_speed', sa.Float()),
        sa.Column('visibility', sa.Float()),
        sa.Column('recorded_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table('transit_statistics',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('checkpoint_id', sa.Integer(), sa.ForeignKey('checkpoints.id'), nullable=False),
        sa.Column('date', sa.String(), nullable=False),
        sa.Column('hour', sa.Integer(), nullable=False),
        sa.Column('vehicles_processed', sa.Integer(), server_default='0'),
        sa.Column('total_cargo_tons', sa.Float(), server_default='0.0'),
        sa.Column('avg_wait_minutes', sa.Float(), server_default='0.0'),
        sa.Column('congestion_level', sa.Float(), server_default='0.0'),
        sa.Column('throughput_score', sa.Float(), server_default='0.0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id')
    )

def downgrade() -> None:
    for table in ['transit_statistics', 'weather_conditions', 'audit_logs', 'simulations', 'predictions', 'events', 'notifications', 'slots', 'orders', 'vehicles', 'checkpoints', 'users']:
        op.drop_table(table)
