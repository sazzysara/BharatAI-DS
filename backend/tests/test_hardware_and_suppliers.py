from app.models import HardwareDevice, Supplier, Benchmark


def test_list_hardware(client, db_session):
    dev1 = HardwareDevice(
        name="Jetson Orin Nano 8GB",
        vendor="NVIDIA",
        category="Edge AI",
        tops_int8=40.0,
        tflops_fp16=20.0,
        memory_gb=8.0,
        memory_bandwidth_gbps=68.0,
        tdp_w=15.0,
        price_inr=45000.0,
        is_indian=False,
        availability_in_india="In Stock",
        source_url="https://www.nvidia.com/en-us/autonomous-machines/embedded-systems/jetson-orin/",
        confidence_level="verified_datasheet",
    )
    dev2 = HardwareDevice(
        name="Vicharak Vaaman",
        vendor="Vicharak",
        category="SBC",
        tops_int8=6.0,
        tflops_fp16=3.0,
        memory_gb=8.0,
        memory_bandwidth_gbps=34.0,
        tdp_w=10.0,
        price_inr=18000.0,
        is_indian=True,
        availability_in_india="In Stock",
        source_url="https://vicharak.in",
        confidence_level="verified_datasheet",
    )
    db_session.add_all([dev1, dev2])
    db_session.commit()

    # List all
    res = client.get("/hardware")
    assert res.status_code == 200
    assert len(res.json()) == 2

    # Filter indian
    res_ind = client.get("/hardware?is_indian=true")
    assert res_ind.status_code == 200
    assert len(res_ind.json()) == 1
    assert res_ind.json()[0]["name"] == "Vicharak Vaaman"


def test_supplier_and_request(client, auth_headers, db_session):
    sup = Supplier(
        name="Robu.in (Macfos Ltd)",
        city="Pune",
        state="Maharashtra",
        latitude=18.5204,
        longitude=73.8567,
        brands="Raspberry Pi, NVIDIA, Coral",
        services="Official Distributor, Component Sourcing",
        website="https://robu.in",
        is_verified=True,
    )
    db_session.add(sup)
    db_session.commit()
    db_session.refresh(sup)

    # List suppliers
    res = client.get("/suppliers?city=Pune")
    assert res.status_code == 200
    assert len(res.json()) == 1
    assert res.json()[0]["name"] == "Robu.in (Macfos Ltd)"

    # Submit request
    req_payload = {
        "supplier_id": sup.id,
        "device_name": "Jetson Orin Nano 8GB",
        "quantity": 5,
        "use_case": "Deployment in Delhi Smart Traffic pilot",
        "contact_name": "Sanjay Kumar",
        "contact_email": "sanjay@startup.in",
        "contact_phone": "+91 9876543210",
    }
    req_res = client.post("/suppliers/requests", json=req_payload, headers=auth_headers)
    assert req_res.status_code == 201
    assert req_res.json()["status"] == "submitted"

    # List user requests
    my_reqs = client.get("/suppliers/requests", headers=auth_headers)
    assert my_reqs.status_code == 200
    assert len(my_reqs.json()) == 1

