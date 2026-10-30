"""initial_schema_with_hardware_analysis

Revision ID: da08f26bc7a3
Revises: 
Create Date: 2026-10-30 00:16:36.972983

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'da08f26bc7a3'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    # Base tables for clean databases
    if 'users' not in tables:
        op.create_table(
            'users',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('name', sa.String(length=120), nullable=False),
            sa.Column('email', sa.String(length=255), nullable=False),
            sa.Column('password_hash', sa.String(length=255), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index('ix_users_email', 'users', ['email'], unique=True)

    if 'projects' not in tables:
        op.create_table(
            'projects',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('name', sa.String(length=120), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index('ix_projects_user_id', 'projects', ['user_id'], unique=False)
    else:
        project_cols = [c['name'] for c in inspector.get_columns('projects')]
        if 'updated_at' not in project_cols:
            with op.batch_alter_table('projects', schema=None) as batch_op:
                batch_op.add_column(sa.Column('updated_at', sa.DateTime(), nullable=True))

    if 'models' not in tables:
        op.create_table(
            'models',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('project_id', sa.Integer(), nullable=False),
            sa.Column('filename', sa.String(length=255), nullable=False),
            sa.Column('framework', sa.String(length=32), nullable=False),
            sa.Column('parameters', sa.Integer(), nullable=True),
            sa.Column('flops', sa.Float(), nullable=True),
            sa.Column('memory', sa.Float(), nullable=True),
            sa.Column('precision', sa.String(length=32), nullable=True),
            sa.Column('input_resolution', sa.String(length=64), nullable=True),
            sa.Column('storage_path', sa.String(length=500), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index('ix_models_project_id', 'models', ['project_id'], unique=False)

    if 'hardware_devices' not in tables:
        op.create_table('hardware_devices',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('name', sa.String(length=120), nullable=False),
            sa.Column('vendor', sa.String(length=100), nullable=False),
            sa.Column('category', sa.String(length=50), nullable=False),
            sa.Column('tops_int8', sa.Float(), nullable=True),
            sa.Column('tflops_fp16', sa.Float(), nullable=True),
            sa.Column('memory_gb', sa.Float(), nullable=False),
            sa.Column('memory_bandwidth_gbps', sa.Float(), nullable=True),
            sa.Column('tdp_w', sa.Float(), nullable=False),
            sa.Column('price_inr', sa.Float(), nullable=False),
            sa.Column('is_indian', sa.Boolean(), nullable=False),
            sa.Column('availability_in_india', sa.String(length=100), nullable=False),
            sa.Column('source_url', sa.String(length=500), nullable=False),
            sa.Column('confidence_level', sa.String(length=50), nullable=False),
            sa.Column('notes', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.PrimaryKeyConstraint('id')
        )
        with op.batch_alter_table('hardware_devices', schema=None) as batch_op:
            batch_op.create_index(batch_op.f('ix_hardware_devices_name'), ['name'], unique=True)
            batch_op.create_index(batch_op.f('ix_hardware_devices_vendor'), ['vendor'], unique=False)

    if 'suppliers' not in tables:
        op.create_table('suppliers',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('name', sa.String(length=150), nullable=False),
            sa.Column('city', sa.String(length=100), nullable=False),
            sa.Column('state', sa.String(length=100), nullable=False),
            sa.Column('latitude', sa.Float(), nullable=True),
            sa.Column('longitude', sa.Float(), nullable=True),
            sa.Column('brands', sa.String(length=255), nullable=False),
            sa.Column('services', sa.String(length=255), nullable=False),
            sa.Column('contact_email', sa.String(length=255), nullable=True),
            sa.Column('contact_phone', sa.String(length=50), nullable=True),
            sa.Column('website', sa.String(length=255), nullable=False),
            sa.Column('is_verified', sa.Boolean(), nullable=False),
            sa.Column('notes', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.PrimaryKeyConstraint('id')
        )
        with op.batch_alter_table('suppliers', schema=None) as batch_op:
            batch_op.create_index(batch_op.f('ix_suppliers_city'), ['city'], unique=False)
            batch_op.create_index(batch_op.f('ix_suppliers_name'), ['name'], unique=False)

    if 'benchmarks' not in tables:
        op.create_table('benchmarks',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('device_id', sa.Integer(), nullable=True),
            sa.Column('device_name', sa.String(length=120), nullable=False),
            sa.Column('model_name', sa.String(length=120), nullable=False),
            sa.Column('model_family', sa.String(length=50), nullable=True),
            sa.Column('precision', sa.String(length=32), nullable=False),
            sa.Column('batch_size', sa.Integer(), nullable=False),
            sa.Column('latency_ms', sa.Float(), nullable=False),
            sa.Column('throughput_fps', sa.Float(), nullable=False),
            sa.Column('power_w', sa.Float(), nullable=True),
            sa.Column('source', sa.String(length=255), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['device_id'], ['hardware_devices.id'], ondelete='SET NULL'),
            sa.PrimaryKeyConstraint('id')
        )
        with op.batch_alter_table('benchmarks', schema=None) as batch_op:
            batch_op.create_index(batch_op.f('ix_benchmarks_device_id'), ['device_id'], unique=False)
            batch_op.create_index(batch_op.f('ix_benchmarks_device_name'), ['device_name'], unique=False)
            batch_op.create_index(batch_op.f('ix_benchmarks_model_name'), ['model_name'], unique=False)

    if 'supplier_requests' not in tables:
        op.create_table('supplier_requests',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('supplier_id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('project_id', sa.Integer(), nullable=True),
            sa.Column('device_name', sa.String(length=150), nullable=True),
            sa.Column('quantity', sa.Integer(), nullable=False),
            sa.Column('use_case', sa.Text(), nullable=False),
            sa.Column('contact_name', sa.String(length=120), nullable=False),
            sa.Column('contact_email', sa.String(length=255), nullable=False),
            sa.Column('contact_phone', sa.String(length=50), nullable=True),
            sa.Column('status', sa.String(length=50), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='SET NULL'),
            sa.ForeignKeyConstraint(['supplier_id'], ['suppliers.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        with op.batch_alter_table('supplier_requests', schema=None) as batch_op:
            batch_op.create_index(batch_op.f('ix_supplier_requests_project_id'), ['project_id'], unique=False)
            batch_op.create_index(batch_op.f('ix_supplier_requests_supplier_id'), ['supplier_id'], unique=False)
            batch_op.create_index(batch_op.f('ix_supplier_requests_user_id'), ['user_id'], unique=False)

    if 'analyses' not in tables:
        op.create_table('analyses',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('model_id', sa.Integer(), nullable=False),
            sa.Column('model_family', sa.String(length=50), nullable=False),
            sa.Column('parameters_count', sa.Integer(), nullable=False),
            sa.Column('flops', sa.Float(), nullable=False),
            sa.Column('macs', sa.Float(), nullable=True),
            sa.Column('activation_memory_mb', sa.Float(), nullable=True),
            sa.Column('weight_memory_mb', sa.Float(), nullable=True),
            sa.Column('total_memory_mb', sa.Float(), nullable=False),
            sa.Column('input_shape', sa.String(length=100), nullable=False),
            sa.Column('precision', sa.String(length=32), nullable=False),
            sa.Column('op_histogram', sa.JSON(), nullable=True),
            sa.Column('analysis_summary', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['model_id'], ['models.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        with op.batch_alter_table('analyses', schema=None) as batch_op:
            batch_op.create_index(batch_op.f('ix_analyses_model_id'), ['model_id'], unique=False)

    if 'reports' not in tables:
        op.create_table('reports',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('project_id', sa.Integer(), nullable=False),
            sa.Column('model_id', sa.Integer(), nullable=True),
            sa.Column('title', sa.String(length=200), nullable=False),
            sa.Column('file_path', sa.String(length=500), nullable=True),
            sa.Column('summary_json', sa.JSON(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['model_id'], ['models.id'], ondelete='SET NULL'),
            sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        with op.batch_alter_table('reports', schema=None) as batch_op:
            batch_op.create_index(batch_op.f('ix_reports_model_id'), ['model_id'], unique=False)
            batch_op.create_index(batch_op.f('ix_reports_project_id'), ['project_id'], unique=False)

    if 'recommendations' not in tables:
        op.create_table('recommendations',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('analysis_id', sa.Integer(), nullable=False),
            sa.Column('project_id', sa.Integer(), nullable=False),
            sa.Column('device_id', sa.Integer(), nullable=False),
            sa.Column('category', sa.String(length=50), nullable=False),
            sa.Column('score', sa.Float(), nullable=False),
            sa.Column('predicted_latency_ms', sa.Float(), nullable=False),
            sa.Column('predicted_power_w', sa.Float(), nullable=False),
            sa.Column('confidence_interval_latency', sa.String(length=100), nullable=True),
            sa.Column('confidence_interval_power', sa.String(length=100), nullable=True),
            sa.Column('rationale', sa.Text(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['analysis_id'], ['analyses.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['device_id'], ['hardware_devices.id'], ),
            sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        with op.batch_alter_table('recommendations', schema=None) as batch_op:
            batch_op.create_index(batch_op.f('ix_recommendations_analysis_id'), ['analysis_id'], unique=False)
            batch_op.create_index(batch_op.f('ix_recommendations_device_id'), ['device_id'], unique=False)
            batch_op.create_index(batch_op.f('ix_recommendations_project_id'), ['project_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('recommendations')
    op.drop_table('reports')
    op.drop_table('analyses')
    op.drop_table('supplier_requests')
    op.drop_table('benchmarks')
    op.drop_table('suppliers')
    op.drop_table('hardware_devices')
