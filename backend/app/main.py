from contextlib import asynccontextmanager
from datetime import datetime, timezone
import logging
import os
from pathlib import Path
from typing import Any, AsyncGenerator
from uuid import uuid4
from fastapi import APIRouter, Depends, FastAPI, File, Form, HTTPException, Query, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import Session
from .config import get_settings
from .database import Base, engine, get_db
from .models import (
    Analysis,
    Benchmark,
    HardwareDevice,
    Model,
    Project,
    Recommendation,
    Report,
    Supplier,
    SupplierRequest,
    User,
)
from .schemas import (
    AnalysisOut,
    AuthResponse,
    BenchmarkOut,
    HardwareDeviceOut,
    LoginRequest,
    ModelOut,
    ProjectCreate,
    ProjectOut,
    ProjectUpdate,
    RecommendationOut,
    ReportOut,
    SignupRequest,
    SupplierOut,
    SupplierRequestCreate,
    SupplierRequestOut,
    UserOut,
)
from .security import create_access_token, get_current_user, password_hash
from .services.analyzer import analyze_model_file
from .services.recommender import generate_recommendations

IS_VERCEL = bool(os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))
UPLOADS_DIR = Path("/tmp/uploads") if IS_VERCEL else Path("uploads")
try:
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
except Exception:
    pass

logger = logging.getLogger("uvicorn.error")
settings = get_settings()


def ensure_tables() -> None:
    try:
        Base.metadata.create_all(bind=engine)
        from .models import HardwareDevice
        from .seed import seed_database
        from .database import SessionLocal
        with SessionLocal() as db:
            count = db.query(HardwareDevice).count()
            if count == 0:
                logger.info("Empty database detected; running automatic hardware & supplier seeding...")
                seed_database()
    except Exception as e:
        logger.warning(f"Error ensuring database tables or seeding: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    ensure_tables()
    yield


app = FastAPI(title="Bharat AI Hardware Intelligence API", version="0.1.0", lifespan=lifespan)

# Allow all origins for Vercel preview URLs, custom domains, and localhost
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": f"Server error: {str(exc)}"},
    )


UPLOADS_DIR = Path("uploads")
SUPPORTED_MODEL_EXTENSIONS = {".onnx": "ONNX", ".pt": "PyTorch", ".pth": "PyTorch", ".tflite": "TFLite"}

router = APIRouter()


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


# ---------------- Auth Endpoints ----------------
@router.post("/auth/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, db: Session = Depends(get_db)) -> AuthResponse:
    ensure_tables()
    existing = db.scalar(select(User).where(User.email == payload.email.lower()))
    if existing:
        raise HTTPException(status_code=409, detail="An account already exists for this email")
    user = User(
        name=payload.name.strip(),
        email=payload.email.lower(),
        password_hash=password_hash.hash(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return AuthResponse(access_token=create_access_token(user.id), user=user)


@router.post("/auth/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    ensure_tables()
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if not user or not password_hash.verify(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    return AuthResponse(access_token=create_access_token(user.id), user=user)


@router.get("/auth/me", response_model=UserOut)
def current_user(user: User = Depends(get_current_user)) -> User:
    return user


# ---------------- Project Endpoints ----------------
@router.post("/projects", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(payload: ProjectCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Project:
    project = Project(user_id=user.id, name=payload.name.strip(), description=payload.description.strip() if payload.description else None)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("/projects", response_model=list[ProjectOut])
def list_projects(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[Project]:
    return list(db.scalars(select(Project).where(Project.user_id == user.id).order_by(Project.created_at.desc())))


@router.get("/projects/{project_id}", response_model=ProjectOut)
def get_project(project_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Project:
    project = db.get(Project, project_id)
    if not project or project.user_id != user.id:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.put("/projects/{project_id}", response_model=ProjectOut)
def update_project(project_id: int, payload: ProjectUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Project:
    project = db.get(Project, project_id)
    if not project or project.user_id != user.id:
        raise HTTPException(status_code=404, detail="Project not found")
    if payload.name is not None:
        project.name = payload.name.strip()
    if payload.description is not None:
        project.description = payload.description.strip()
    project.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(project)
    return project


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> None:
    project = db.get(Project, project_id)
    if not project or project.user_id != user.id:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    db.commit()


# ---------------- Model Endpoints ----------------
@router.post("/models/upload", response_model=ModelOut, status_code=status.HTTP_201_CREATED)
async def upload_model(
    project_id: int = Form(...),
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Model:
    project = db.get(Project, project_id)
    if not project or project.user_id != user.id:
        raise HTTPException(status_code=404, detail="Project not found")
    filename = Path(file.filename or "").name
    extension = Path(filename).suffix.lower()
    framework = SUPPORTED_MODEL_EXTENSIONS.get(extension)
    if not framework:
        raise HTTPException(status_code=422, detail="Upload an ONNX (.onnx), PyTorch (.pt/.pth), or TFLite (.tflite) model")
    destination_dir = UPLOADS_DIR / f"project-{project.id}"
    destination_dir.mkdir(parents=True, exist_ok=True)
    destination = destination_dir / f"{uuid4().hex}{extension}"
    total_size = 0
    try:
        with destination.open("wb") as output:
            while chunk := await file.read(1024 * 1024):
                total_size += len(chunk)
                if total_size > 250 * 1024 * 1024:
                    output.close()
                    destination.unlink(missing_ok=True)
                    raise HTTPException(status_code=413, detail="Model file must be 250 MB or smaller")
                output.write(chunk)
    finally:
        await file.close()
    model = Model(project_id=project.id, filename=filename, framework=framework, precision="Unknown", storage_path=str(destination))
    db.add(model)
    db.commit()
    db.refresh(model)

    # Automatically run initial computational profiling and multi-criteria recommendation
    try:
        profile = analyze_model_file(str(destination), filename)
        model.parameters = profile["parameters_count"]
        model.flops = profile["flops"]
        model.memory = profile["total_memory_mb"]
        model.precision = profile["precision"]
        model.input_resolution = profile["input_shape"]

        analysis = Analysis(
            model_id=model.id,
            model_family=profile["model_family"],
            parameters_count=profile["parameters_count"],
            flops=profile["flops"],
            macs=profile.get("macs"),
            activation_memory_mb=profile.get("activation_memory_mb"),
            weight_memory_mb=profile.get("weight_memory_mb"),
            total_memory_mb=profile["total_memory_mb"],
            input_shape=profile["input_shape"],
            precision=profile["precision"],
            op_histogram=profile.get("op_histogram"),
            analysis_summary=profile.get("analysis_summary"),
        )
        db.add(analysis)
        db.commit()
        db.refresh(analysis)

        # Generate hardware recommendations using TOPSIS
        generate_recommendations(analysis, db)
        db.refresh(model)
    except Exception as e:
        logger.warning(f"Error during automatic model profiling: {e}")

    return model


@router.post("/models/{model_id}/analyze", response_model=AnalysisOut)
def analyze_model_endpoint(
    model_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Analysis:
    model = get_model(model_id, user, db)
    if not Path(model.storage_path).exists():
        raise HTTPException(status_code=404, detail="Model file not found on server disk")

    profile = analyze_model_file(model.storage_path, model.filename)
    model.parameters = profile["parameters_count"]
    model.flops = profile["flops"]
    model.memory = profile["total_memory_mb"]
    model.precision = profile["precision"]
    model.input_resolution = profile["input_shape"]

    analysis = Analysis(
        model_id=model.id,
        model_family=profile["model_family"],
        parameters_count=profile["parameters_count"],
        flops=profile["flops"],
        macs=profile.get("macs"),
        activation_memory_mb=profile.get("activation_memory_mb"),
        weight_memory_mb=profile.get("weight_memory_mb"),
        total_memory_mb=profile["total_memory_mb"],
        input_shape=profile["input_shape"],
        precision=profile["precision"],
        op_histogram=profile.get("op_histogram"),
        analysis_summary=profile.get("analysis_summary"),
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    generate_recommendations(analysis, db)
    return analysis


@router.get("/models/{model_id}", response_model=ModelOut)
def get_model(model_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Model:
    model = db.get(Model, model_id)
    if not model or model.project.user_id != user.id:
        raise HTTPException(status_code=404, detail="Model not found")
    return model


@router.get("/projects/{project_id}/models", response_model=list[ModelOut])
def list_models(project_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[Model]:
    project = get_project(project_id, user, db)
    return list(db.scalars(select(Model).where(Model.project_id == project.id).order_by(Model.created_at.desc())))


@router.post("/projects/{project_id}/load-sample", response_model=ModelOut, status_code=status.HTTP_201_CREATED)
def load_sample_model(
    project_id: int,
    sample_name: str = Query(..., description="Sample model filename in samples/"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Model:
    import shutil
    project = get_project(project_id, user, db)
    
    # Locate samples directory robustly across local and serverless environments
    candidates = [
        Path(__file__).resolve().parent.parent.parent / "samples",
        Path(__file__).resolve().parent.parent / "samples",
        Path("samples").resolve(),
        Path("/var/task/samples"),
    ]
    sample_file = None
    for cand in candidates:
        if (cand / sample_name).exists():
            sample_file = cand / sample_name
            break

    if not sample_file or not sample_file.exists():
        raise HTTPException(status_code=404, detail=f"Sample model '{sample_name}' not found on server")

    dest_dir = UPLOADS_DIR / f"project-{project.id}"
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_path = dest_dir / f"{uuid4().hex}_{sample_name}"
    shutil.copyfile(sample_file, dest_path)

    model = Model(
        project_id=project.id,
        filename=sample_name,
        framework="ONNX",
        precision="FP32",
        storage_path=str(dest_path),
    )
    db.add(model)
    db.commit()
    db.refresh(model)

    try:
        profile = analyze_model_file(str(dest_path), sample_name)
        model.parameters = profile["parameters_count"]
        model.flops = profile["flops"]
        model.memory = profile["total_memory_mb"]
        model.precision = profile["precision"]
        model.input_resolution = profile["input_shape"]

        analysis = Analysis(
            model_id=model.id,
            model_family=profile["model_family"],
            parameters_count=profile["parameters_count"],
            flops=profile["flops"],
            macs=profile.get("macs"),
            activation_memory_mb=profile.get("activation_memory_mb"),
            weight_memory_mb=profile.get("weight_memory_mb"),
            total_memory_mb=profile["total_memory_mb"],
            input_shape=profile["input_shape"],
            precision=profile["precision"],
            op_histogram=profile.get("op_histogram"),
            analysis_summary=profile.get("analysis_summary"),
        )
        db.add(analysis)
        db.commit()
        db.refresh(analysis)

        generate_recommendations(analysis, db)
        db.refresh(model)
    except Exception as e:
        logger.warning(f"Error profiling sample model: {e}")

    return model


# ---------------- Hardware Devices Endpoints ----------------
@router.get("/hardware", response_model=list[HardwareDeviceOut])
def list_hardware(
    category: str | None = None,
    is_indian: bool | None = None,
    db: Session = Depends(get_db),
) -> list[HardwareDevice]:
    ensure_tables()
    stmt = select(HardwareDevice)
    if category:
        stmt = stmt.where(HardwareDevice.category == category)
    if is_indian is not None:
        stmt = stmt.where(HardwareDevice.is_indian == is_indian)
    return list(db.scalars(stmt.order_by(HardwareDevice.name)))


@router.get("/hardware/{device_id}", response_model=HardwareDeviceOut)
def get_hardware(device_id: int, db: Session = Depends(get_db)) -> HardwareDevice:
    ensure_tables()
    device = db.get(HardwareDevice, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Hardware device not found")
    return device


# ---------------- Benchmarks Endpoints ----------------
@router.get("/benchmarks", response_model=list[BenchmarkOut])
def list_benchmarks(
    device_id: int | None = None,
    model_name: str | None = None,
    db: Session = Depends(get_db),
) -> list[Benchmark]:
    ensure_tables()
    stmt = select(Benchmark)
    if device_id is not None:
        stmt = stmt.where(Benchmark.device_id == device_id)
    if model_name:
        stmt = stmt.where(Benchmark.model_name.ilike(f"%{model_name}%"))
    return list(db.scalars(stmt.order_by(Benchmark.created_at.desc())))


# ---------------- Analyses Endpoints ----------------
@router.get("/models/{model_id}/analyses", response_model=list[AnalysisOut])
def list_model_analyses(model_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[Analysis]:
    model = get_model(model_id, user, db)
    return list(db.scalars(select(Analysis).where(Analysis.model_id == model.id).order_by(Analysis.created_at.desc())))


@router.get("/analyses/{analysis_id}", response_model=AnalysisOut)
def get_analysis(analysis_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Analysis:
    analysis = db.get(Analysis, analysis_id)
    if not analysis or analysis.model.project.user_id != user.id:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return analysis


# ---------------- Recommendations Endpoints ----------------
@router.get("/projects/{project_id}/recommendations", response_model=list[RecommendationOut])
def list_recommendations(project_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[Recommendation]:
    project = get_project(project_id, user, db)
    return list(db.scalars(select(Recommendation).where(Recommendation.project_id == project.id).order_by(Recommendation.created_at.desc())))


# ---------------- Suppliers & Requests Endpoints ----------------
@router.get("/suppliers", response_model=list[SupplierOut])
def list_suppliers(
    city: str | None = None,
    brand: str | None = None,
    db: Session = Depends(get_db),
) -> list[Supplier]:
    ensure_tables()
    stmt = select(Supplier)
    if city:
        stmt = stmt.where(Supplier.city.ilike(f"%{city}%"))
    if brand:
        stmt = stmt.where(Supplier.brands.ilike(f"%{brand}%"))
    return list(db.scalars(stmt.order_by(Supplier.name)))


@router.post("/suppliers/requests", response_model=SupplierRequestOut, status_code=status.HTTP_201_CREATED)
def create_supplier_request(
    payload: SupplierRequestCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SupplierRequest:
    ensure_tables()
    supplier = db.get(Supplier, payload.supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    if payload.project_id:
        project = db.get(Project, payload.project_id)
        if not project or project.user_id != user.id:
            raise HTTPException(status_code=404, detail="Project not found")

    req = SupplierRequest(
        supplier_id=payload.supplier_id,
        user_id=user.id,
        project_id=payload.project_id,
        device_name=payload.device_name,
        quantity=payload.quantity,
        use_case=payload.use_case.strip(),
        contact_name=payload.contact_name.strip(),
        contact_email=payload.contact_email.lower(),
        contact_phone=payload.contact_phone.strip() if payload.contact_phone else None,
        status="submitted",
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return req


@router.get("/suppliers/requests", response_model=list[SupplierRequestOut])
def list_user_supplier_requests(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[SupplierRequest]:
    return list(db.scalars(select(SupplierRequest).where(SupplierRequest.user_id == user.id).order_by(SupplierRequest.created_at.desc())))


# ---------------- Reports Endpoints ----------------
@router.get("/projects/{project_id}/reports", response_model=list[ReportOut])
def list_reports(project_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[Report]:
    project = get_project(project_id, user, db)
    return list(db.scalars(select(Report).where(Report.project_id == project.id).order_by(Report.created_at.desc())))


# Mount router for both root and /api prefixes
app.include_router(router)
app.include_router(router, prefix="/api")
