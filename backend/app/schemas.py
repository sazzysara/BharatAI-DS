from datetime import datetime
from typing import Any
from pydantic import BaseModel, EmailStr, Field


# ---------------- Auth Schemas ----------------
class SignupRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    created_at: datetime
    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------------- Project Schemas ----------------
class ProjectSpecificationRequest(BaseModel):
    model_name: str = Field(min_length=2, max_length=150, default="Llama-3-8B-Instruct")
    model_type: str = Field(default="LLM", description="LLM, Vision / CNN, Audio / Speech, Transformer / NLP")
    parameter_count_b: float = Field(default=8.0, ge=0.001, description="Parameters in Billions (e.g. 8.0 for 8B, 0.025 for 25M)")
    precision: str = Field(default="INT4", description="FP32, FP16, BF16, INT8, INT4")
    workload: str = Field(default="Inference", description="Inference, LoRA Fine-Tuning, Full Training")
    target_environment: str = Field(default="Workstation", description="Drone / Battery, Edge Appliance, Workstation, Datacenter")
    target_latency_ms: float | None = Field(default=None, description="Max acceptable latency per token/frame in ms")
    target_throughput: float | None = Field(default=None, description="Target Tokens/sec or FPS")
    max_budget_inr: float | None = Field(default=None, description="Maximum capital budget in INR")
    max_power_w: float | None = Field(default=None, description="Maximum power consumption in Watts")
    context_length: int = Field(default=4096, ge=128, le=131072)
    batch_size: int = Field(default=1, ge=1, le=256)
    concurrent_users: int = Field(default=1, ge=1, le=1000)
    priority: str = Field(default="Balanced", description="Cost-Efficient, Maximum Performance, Low Power, Balanced, Sovereign Indian")
    prefer_indian: bool = Field(default=False)


class ProjectCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=1000)


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=1000)


class ProjectOut(BaseModel):
    id: int
    name: str
    description: str | None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


# ---------------- Model Schemas ----------------
class ModelOut(BaseModel):
    id: int
    project_id: int
    filename: str
    framework: str
    parameters: int | None
    flops: float | None
    memory: float | None
    precision: str | None
    input_resolution: str | None
    created_at: datetime
    model_config = {"from_attributes": True}


# ---------------- Hardware Device Schemas ----------------
class HardwareDeviceBase(BaseModel):
    name: str
    vendor: str
    category: str
    tops_int8: float | None = None
    tflops_fp16: float | None = None
    memory_gb: float
    memory_bandwidth_gbps: float | None = None
    tdp_w: float
    price_inr: float
    is_indian: bool = False
    availability_in_india: str
    source_url: str
    confidence_level: str
    notes: str | None = None


class HardwareDeviceOut(HardwareDeviceBase):
    id: int
    created_at: datetime
    model_config = {"from_attributes": True}


# ---------------- Benchmark Schemas ----------------
class BenchmarkOut(BaseModel):
    id: int
    device_id: int | None
    device_name: str
    model_name: str
    model_family: str | None
    precision: str
    batch_size: int
    latency_ms: float
    throughput_fps: float
    power_w: float | None
    source: str
    created_at: datetime
    model_config = {"from_attributes": True}


# ---------------- Analysis Schemas ----------------
class AnalysisOut(BaseModel):
    id: int
    model_id: int
    model_family: str
    parameters_count: int
    flops: float
    macs: float | None
    activation_memory_mb: float | None
    weight_memory_mb: float | None
    total_memory_mb: float
    input_shape: str
    precision: str
    op_histogram: dict[str, int] | None = None
    analysis_summary: str | None
    created_at: datetime
    model_config = {"from_attributes": True}


# ---------------- Recommendation Schemas ----------------
class RecommendationOut(BaseModel):
    id: int
    analysis_id: int
    project_id: int
    device_id: int
    category: str
    score: float
    predicted_latency_ms: float
    predicted_power_w: float
    confidence_interval_latency: str | None = None
    confidence_interval_power: str | None = None
    rationale: str
    created_at: datetime
    device: HardwareDeviceOut | None = None
    model_config = {"from_attributes": True}


# ---------------- Supplier Schemas ----------------
class SupplierOut(BaseModel):
    id: int
    name: str
    city: str
    state: str
    latitude: float | None
    longitude: float | None
    brands: str
    services: str
    contact_email: str | None
    contact_phone: str | None
    website: str
    is_verified: bool
    notes: str | None
    created_at: datetime
    model_config = {"from_attributes": True}


class SupplierRequestCreate(BaseModel):
    supplier_id: int
    project_id: int | None = None
    device_name: str | None = None
    quantity: int = Field(default=1, ge=1)
    use_case: str = Field(min_length=5)
    contact_name: str = Field(min_length=2, max_length=120)
    contact_email: EmailStr
    contact_phone: str | None = None


class SupplierRequestOut(BaseModel):
    id: int
    supplier_id: int
    user_id: int
    project_id: int | None
    device_name: str | None
    quantity: int
    use_case: str
    contact_name: str
    contact_email: str
    contact_phone: str | None
    status: str
    created_at: datetime
    supplier: SupplierOut | None = None
    model_config = {"from_attributes": True}


# ---------------- Report Schemas ----------------
class ReportOut(BaseModel):
    id: int
    project_id: int
    model_id: int | None
    title: str
    file_path: str | None
    summary_json: dict[str, Any] | None = None
    created_at: datetime
    model_config = {"from_attributes": True}
