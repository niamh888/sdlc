def test_signup_and_login(client):
    resp = client.post("/auth/signup", json={"email": "a@example.com", "password": "password123", "full_name": "A"})
    assert resp.status_code == 201
    assert resp.json()["user"]["email"] == "a@example.com"

    resp = client.post("/auth/login", json={"email": "a@example.com", "password": "password123"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_signup_duplicate_email_rejected(client):
    body = {"email": "dup@example.com", "password": "password123", "full_name": "A"}
    client.post("/auth/signup", json=body)
    resp = client.post("/auth/signup", json=body)
    assert resp.status_code == 409


def test_login_wrong_password_rejected(client):
    client.post("/auth/signup", json={"email": "b@example.com", "password": "password123", "full_name": "B"})
    resp = client.post("/auth/login", json={"email": "b@example.com", "password": "wrongpassword"})
    assert resp.status_code == 401


def test_login_unknown_email_rejected(client):
    resp = client.post("/auth/login", json={"email": "nobody@example.com", "password": "password123"})
    assert resp.status_code == 401


def test_me_requires_token(client):
    resp = client.get("/auth/me")
    assert resp.status_code == 401


def test_me_returns_current_user(client, auth_headers):
    resp = client.get("/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["email"] == "learner@example.com"
