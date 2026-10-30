import io
import pytest
from backend.app.services.document_parser import parse_project_specification_document, parse_text_to_spec


def test_parse_text_to_spec_llm():
    sample_text = """
    Project: Indic Enterprise Assistant
    We are building a multilingual Large Language Model based on Llama-3 8B.
    Target latency: < 50ms per token response.
    Target budget: under ₹2,00,000 INR.
    TDP Power consumption: under 350W.
    Quantization: INT4 AWQ.
    Context length: 8192 tokens with 5 concurrent users.
    Prioritize Indian semiconductor and sovereign silicon where possible.
    """
    spec = parse_text_to_spec(sample_text, "indic_spec.txt")
    assert spec["model_type"] == "LLM"
    assert spec["parameter_count_b"] == 8.0
    assert spec["precision"] == "INT4"
    assert spec["max_budget_inr"] == 200000.0
    assert spec["max_power_w"] == 350.0
    assert spec["context_length"] == 8192
    assert spec["concurrent_users"] == 5
    assert spec["prefer_indian"] is True


def test_parse_text_to_spec_edge_vision():
    sample_text = """
    Project: Highway Traffic CCTV Helmet Detection
    Model architecture: YOLOv8 edge vision detector.
    Parameters: 25 million params.
    Target output time: 20 ms real-time video processing.
    Max budget: ₹15,000 INR.
    Environment: Edge drone and battery surveillance.
    """
    spec = parse_text_to_spec(sample_text, "highway_traffic.docx")
    assert spec["model_type"] == "CNN / Vision"
    assert spec["parameter_count_b"] == 0.025
    assert spec["target_environment"] == "Drone / Battery"
    assert spec["max_budget_inr"] == 15000.0


def test_endpoints_specification(client, auth_headers):
    # 1. Create a test project
    p_resp = client.post("/projects", json={"name": "Parametric Test", "description": "Testing AI specs"}, headers=auth_headers)
    assert p_resp.status_code == 201
    proj_id = p_resp.json()["id"]

    # 2. Test specify-and-recommend
    spec_payload = {
        "model_name": "Mistral-7B-Instruct",
        "model_type": "LLM",
        "parameter_count_b": 7.0,
        "precision": "INT4",
        "workload": "Inference",
        "target_environment": "Workstation",
        "target_latency_ms": 40.0,
        "max_budget_inr": 250000.0,
        "context_length": 4096,
        "concurrent_users": 2,
        "priority": "Cost-Efficient",
        "prefer_indian": False,
    }
    spec_resp = client.post(f"/projects/{proj_id}/specify-and-recommend", json=spec_payload, headers=auth_headers)
    assert spec_resp.status_code == 201
    model_data = spec_resp.json()
    assert "[Spec] Mistral-7B-Instruct" in model_data["filename"]
    assert model_data["parameters"] == 7000000000

    # 3. Verify recommendations were created for this project
    recs_resp = client.get(f"/projects/{proj_id}/recommendations", headers=auth_headers)
    assert recs_resp.status_code == 200
    recs = recs_resp.json()
    assert len(recs) >= 3
    categories = [r["category"] for r in recs]
    assert "Recommended Configuration" in categories
    assert "Optimal Configuration" in categories
    assert "Minimum Configuration" in categories

