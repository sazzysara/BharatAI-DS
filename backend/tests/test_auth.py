def test_signup_success(client):
    response = client.post(
        "/auth/signup",
        json={"name": "Aarav Sharma", "email": "aarav@example.in", "password": "SecurePassword123"},
    )
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "aarav@example.in"
    assert data["user"]["name"] == "Aarav Sharma"


def test_signup_duplicate_email(client):
    payload = {"name": "Aarav Sharma", "email": "duplicate@example.in", "password": "SecurePassword123"}
    r1 = client.post("/auth/signup", json=payload)
    assert r1.status_code == 201

    r2 = client.post("/auth/signup", json=payload)
    assert r2.status_code == 409
    assert "already exists" in r2.json()["detail"]


def test_login_success(client):
    payload = {"name": "Priya Patel", "email": "priya@example.in", "password": "MySecretPassWord1"}
    client.post("/auth/signup", json=payload)

    login_res = client.post("/auth/login", json={"email": "priya@example.in", "password": "MySecretPassWord1"})
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()


def test_login_wrong_password(client):
    payload = {"name": "Priya Patel", "email": "priya2@example.in", "password": "MySecretPassWord1"}
    client.post("/auth/signup", json=payload)

    login_res = client.post("/auth/login", json={"email": "priya2@example.in", "password": "WrongPassword"})
    assert login_res.status_code == 401


def test_get_current_user_me(client, auth_headers):
    response = client.get("/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@bharatai.org"
    assert data["name"] == "Test Engineer"


def test_unauthorized_without_token(client):
    response = client.get("/auth/me")
    assert response.status_code == 401 or response.status_code == 403

