from pathlib import Path
from app.database import Base, SessionLocal, engine
from app.models import Analysis, HardwareDevice, Model, Project, Recommendation, User
from app.seed import seed_database
from app.services.analyzer import analyze_model_file
from app.services.recommender import generate_recommendations


def test_analyzer_on_sample_models():
    samples_dir = Path("samples")
    assert (samples_dir / "mobilenetv2_helmet_detection.onnx").exists()
    assert (samples_dir / "resnet50_industrial_defect.onnx").exists()
    assert (samples_dir / "indic_bert_transformer.onnx").exists()

    # 1. Analyze MobileNetV2
    mb_res = analyze_model_file(str(samples_dir / "mobilenetv2_helmet_detection.onnx"), "mobilenetv2_helmet_detection.onnx")
    assert mb_res["model_family"] == "CNN"
    assert mb_res["parameters_count"] > 100_000
    assert mb_res["flops"] > 0
    assert "Conv" in mb_res["op_histogram"]

    # 2. Analyze ResNet50
    rn_res = analyze_model_file(str(samples_dir / "resnet50_industrial_defect.onnx"), "resnet50_industrial_defect.onnx")
    assert rn_res["model_family"] == "CNN"
    assert rn_res["parameters_count"] > 1_000_000
    assert rn_res["flops"] > 0

    # 3. Analyze Transformer
    tf_res = analyze_model_file(str(samples_dir / "indic_bert_transformer.onnx"), "indic_bert_transformer.onnx")
    assert tf_res["model_family"] == "Transformer"
    assert "MatMul" in tf_res["op_histogram"] or "LayerNormalization" in tf_res["op_histogram"]


def test_recommendation_engine_topsis():
    seed_database()
    db = SessionLocal()

    # Create dummy user & project
    user = db.query(User).first()
    if not user:
        user = User(name="Test Judge", email="judge@ai.gov.in", password_hash="hash")
        db.add(user)
        db.commit()
        db.refresh(user)

    project = db.query(Project).filter(Project.user_id == user.id).first()
    if not project:
        project = Project(user_id=user.id, name="Smart Surveillance Unit")
        db.add(project)
        db.commit()
        db.refresh(project)

    # Attach model & analysis
    model = Model(
        project_id=project.id,
        filename="mobilenetv2_helmet_detection.onnx",
        framework="ONNX",
        storage_path="samples/mobilenetv2_helmet_detection.onnx",
    )
    db.add(model)
    db.commit()
    db.refresh(model)

    analysis = Analysis(
        model_id=model.id,
        model_family="CNN",
        parameters_count=167082,
        flops=2.137,
        total_memory_mb=120.0,
        precision="FP32",
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    # Run recommendation
    recs = generate_recommendations(analysis, db)
    assert len(recs) >= 4

    categories = [r.category for r in recs]
    assert "Best Overall" in categories
    assert "Best Performance" in categories
    assert "Best Cost" in categories
    assert "Best Indian Alternative" in categories

    # Verify best overall has valid TOPSIS score
    overall = next(r for r in recs if r.category == "Best Overall")
    assert 0.0 <= overall.score <= 1.0
    assert overall.predicted_latency_ms > 0
    assert overall.predicted_power_w > 0
    assert "TOPSIS" in overall.rationale

    # Verify Best Indian Alternative is marked is_indian
    indian_rec = next(r for r in recs if r.category == "Best Indian Alternative")
    assert indian_rec.device.is_indian is True

    db.close()
