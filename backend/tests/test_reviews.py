from .conftest import COURSE_ID


def _review_body(**overrides):
    body = {"course_id": COURSE_ID, "participant_name": "Test Learner", "rating": 5, "comment": "Great course!"}
    body.update(overrides)
    return body


def test_list_reviews_public_no_auth_needed(client):
    resp = client.get("/reviews", params={"course_id": COURSE_ID})
    assert resp.status_code == 200
    assert resp.json() == []


def test_submit_review_is_pending_and_hidden_from_public_list(client, auth_headers):
    resp = client.post("/reviews", headers=auth_headers, json=_review_body())
    assert resp.status_code == 201

    # Not shown publicly yet — GET /reviews only ever returns approved rows.
    resp = client.get("/reviews", params={"course_id": COURSE_ID})
    assert resp.json() == []

    # But the author can see their own, still-pending review.
    resp = client.get("/reviews/me", params={"course_id": COURSE_ID}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "pending"


def test_no_review_yet_returns_empty_not_an_error(client, auth_headers):
    resp = client.get("/reviews/me", params={"course_id": COURSE_ID}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() is None


def test_second_review_for_same_course_rejected(client, auth_headers):
    body = _review_body()
    client.post("/reviews", headers=auth_headers, json=body)
    resp = client.post("/reviews", headers=auth_headers, json=body)
    assert resp.status_code == 409


def test_review_requires_auth(client):
    resp = client.post("/reviews", json=_review_body(participant_name="Anon"))
    assert resp.status_code == 401


def test_out_of_range_rating_rejected(client, auth_headers):
    resp = client.post("/reviews", headers=auth_headers, json=_review_body(rating=6))
    assert resp.status_code == 422  # Pydantic validation — see Field(ge=1, le=5) in schemas.py
