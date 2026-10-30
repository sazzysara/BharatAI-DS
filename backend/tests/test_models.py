import io


def test_upload_and_get_model(client, auth_headers):
    # Create project first
    p_res = client.post(
        "/projects",
        json={"name": "Agricultural Crop AI", "description": "Disease classification"},
        headers=auth_headers,
    )
    project_id = p_res.json()["id"]

    # Upload dummy ONNX model file
    fake_onnx_bytes = b"ONNX_DUMMY_BYTE_STREAM"
    files = {"file": ("crop_detector.onnx", io.BytesIO(fake_onnx_bytes), "application/octet-stream")}
    data = {"project_id": str(project_id)}

    upload_res = client.post("/models/upload", data=data, files=files, headers=auth_headers)
    assert upload_res.status_code == 201
    model_data = upload_res.json()
    assert model_data["filename"] == "crop_detector.onnx"
    assert model_data["framework"] == "ONNX"
    model_id = model_data["id"]

    # Fetch model
    get_res = client.get(f"/models/{model_id}", headers=auth_headers)
    assert get_res.status_code == 200
    assert get_res.json()["id"] == model_id

    # List project models
    list_res = client.get(f"/projects/{project_id}/models", headers=auth_headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1


def test_upload_invalid_extension(client, auth_headers):
    p_res = client.post("/projects", json={"name": "P1"}, headers=auth_headers)
    project_id = p_res.json()["id"]

    files = {"file": ("model.exe", io.BytesIO(b"malicious"), "application/octet-stream")}
    res = client.post("/models/upload", data={"project_id": str(project_id)}, files=files, headers=auth_headers)
    assert res.status_code == 422

