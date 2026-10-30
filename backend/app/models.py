from datetime import datetime, timezone
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    
    projects: Mapped[list["Project"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    supplier_requests: Mapped[list["SupplierRequest"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Project(Base):
    __tablename__ = "projects"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
    
    user: Mapped[User] = relationship(back_populates="projects")
    models: Mapped[list["Model"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    recommendations: Mapped[list["Recommendation"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    reports: Mapped[list["Report"]] = relationship(back_populates="project", cascade="all, delete-orphan")


class Model(Base):
    __tablename__ = "models"
    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    filename: Mapped[str] = mapped_column(String(255))
    framework: Mapped[str] = mapped_column(String(32))
    parameters: Mapped[int | None] = mapped_column(Integer, nullable=True)
    flops: Mapped[float | None] = mapped_column(Float, nullable=True)
    memory: Mapped[float | None] = mapped_column(Float, nullable=True)
    precision: Mapped[str | None] = mapped_column(String(32), nullable=True)
    input_resolution: Mapped[str | None] = mapped_column(String(64), nullable=True)
    storage_path: Mapped[str] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    
    project: Mapped[Project] = relationship(back_populates="models")
    analyses: Mapped[list["Analysis"]] = relationship(back_populates="model", cascade="all, delete-orphan")
    reports: Mapped[list["Report"]] = relationship(back_populates="model")


class HardwareDevice(Base):
    __tablename__ = "hardware_devices"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    vendor: Mapped[str] = mapped_column(String(100), index=True)
    category: Mapped[str] = mapped_column(String(50))  # 'GPU', 'Edge AI', 'NPU', 'CPU', 'SBC'
    tops_int8: Mapped[float | None] = mapped_column(Float, nullable=True)
    tflops_fp16: Mapped[float | None] = mapped_column(Float, nullable=True)
    memory_gb: Mapped[float] = mapped_column(Float)
    memory_bandwidth_gbps: Mapped[float | None] = mapped_column(Float, nullable=True)
    tdp_w: Mapped[float] = mapped_column(Float)
    price_inr: Mapped[float] = mapped_column(Float)
    is_indian: Mapped[bool] = mapped_column(Boolean, default=False)
    availability_in_india: Mapped[str] = mapped_column(String(100))  # 'In Stock', 'Direct Import', 'Available via Partner', 'Early Access'
    source_url: Mapped[str] = mapped_column(String(500))
    confidence_level: Mapped[str] = mapped_column(String(50), default="verified_datasheet")  # 'verified_datasheet', 'vendor_benchmark', 'estimated'
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    benchmarks: Mapped[list["Benchmark"]] = relationship(back_populates="device", cascade="all, delete-orphan")
    recommendations: Mapped[list["Recommendation"]] = relationship(back_populates="device")


class Benchmark(Base):
    __tablename__ = "benchmarks"
    id: Mapped[int] = mapped_column(primary_key=True)
    device_id: Mapped[int | None] = mapped_column(ForeignKey("hardware_devices.id", ondelete="SET NULL"), nullable=True, index=True)
    device_name: Mapped[str] = mapped_column(String(120), index=True)
    model_name: Mapped[str] = mapped_column(String(120), index=True)
    model_family: Mapped[str | None] = mapped_column(String(50), nullable=True)
    precision: Mapped[str] = mapped_column(String(32), default="FP32")
    batch_size: Mapped[int] = mapped_column(Integer, default=1)
    latency_ms: Mapped[float] = mapped_column(Float)
    throughput_fps: Mapped[float] = mapped_column(Float)
    power_w: Mapped[float | None] = mapped_column(Float, nullable=True)
    source: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    device: Mapped[HardwareDevice | None] = relationship(back_populates="benchmarks")


class Analysis(Base):
    __tablename__ = "analyses"
    id: Mapped[int] = mapped_column(primary_key=True)
    model_id: Mapped[int] = mapped_column(ForeignKey("models.id", ondelete="CASCADE"), index=True)
    model_family: Mapped[str] = mapped_column(String(50), default="CNN")
    parameters_count: Mapped[int] = mapped_column(Integer, default=0)
    flops: Mapped[float] = mapped_column(Float, default=0.0)
    macs: Mapped[float | None] = mapped_column(Float, nullable=True)
    activation_memory_mb: Mapped[float | None] = mapped_column(Float, nullable=True)
    weight_memory_mb: Mapped[float | None] = mapped_column(Float, nullable=True)
    total_memory_mb: Mapped[float] = mapped_column(Float, default=0.0)
    input_shape: Mapped[str] = mapped_column(String(100), default="1,3,224,224")
    precision: Mapped[str] = mapped_column(String(32), default="FP32")
    op_histogram: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    analysis_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    model: Mapped[Model] = relationship(back_populates="analyses")
    recommendations: Mapped[list["Recommendation"]] = relationship(back_populates="analysis", cascade="all, delete-orphan")


class Recommendation(Base):
    __tablename__ = "recommendations"
    id: Mapped[int] = mapped_column(primary_key=True)
    analysis_id: Mapped[int] = mapped_column(ForeignKey("analyses.id", ondelete="CASCADE"), index=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    device_id: Mapped[int] = mapped_column(ForeignKey("hardware_devices.id"), index=True)
    category: Mapped[str] = mapped_column(String(50))  # 'Best Overall', 'Best Performance', 'Best Cost', 'Best Power', 'Best Indian Alternative'
    score: Mapped[float] = mapped_column(Float)
    predicted_latency_ms: Mapped[float] = mapped_column(Float)
    predicted_power_w: Mapped[float] = mapped_column(Float)
    confidence_interval_latency: Mapped[str | None] = mapped_column(String(100), nullable=True)
    confidence_interval_power: Mapped[str | None] = mapped_column(String(100), nullable=True)
    rationale: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    analysis: Mapped[Analysis] = relationship(back_populates="recommendations")
    project: Mapped[Project] = relationship(back_populates="recommendations")
    device: Mapped[HardwareDevice] = relationship(back_populates="recommendations")


class Supplier(Base):
    __tablename__ = "suppliers"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150), index=True)
    city: Mapped[str] = mapped_column(String(100), index=True)
    state: Mapped[str] = mapped_column(String(100))
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    brands: Mapped[str] = mapped_column(String(255))
    services: Mapped[str] = mapped_column(String(255))
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    website: Mapped[str] = mapped_column(String(255))
    is_verified: Mapped[bool] = mapped_column(Boolean, default=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    requests: Mapped[list["SupplierRequest"]] = relationship(back_populates="supplier", cascade="all, delete-orphan")


class SupplierRequest(Base):
    __tablename__ = "supplier_requests"
    id: Mapped[int] = mapped_column(primary_key=True)
    supplier_id: Mapped[int] = mapped_column(ForeignKey("suppliers.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    project_id: Mapped[int | None] = mapped_column(ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True)
    device_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    use_case: Mapped[str] = mapped_column(Text)
    contact_name: Mapped[str] = mapped_column(String(120))
    contact_email: Mapped[str] = mapped_column(String(255))
    contact_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="submitted")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    supplier: Mapped[Supplier] = relationship(back_populates="requests")
    user: Mapped[User] = relationship(back_populates="supplier_requests")


class Report(Base):
    __tablename__ = "reports"
    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    model_id: Mapped[int | None] = mapped_column(ForeignKey("models.id", ondelete="SET NULL"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(200))
    file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    summary_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    project: Mapped[Project] = relationship(back_populates="reports")
    model: Mapped[Model | None] = relationship(back_populates="reports")
