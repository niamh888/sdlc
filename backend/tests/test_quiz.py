import uuid
from datetime import datetime, timezone

from app.models import QuizQuestion

from .conftest import COURSE_VERSION_ID, TestSessionLocal


def _add_question():
    db = TestSessionLocal()
    db.add(QuizQuestion(
        course_version_id=COURSE_VERSION_ID, level="intro", question="2 + 2?",
        options=["3", "4", "5", "6"], correct_index=1, explanation="Basic arithmetic.",
    ))
    db.commit()
    db.close()


def _attempt_body(**overrides):
    body = {
        "course_version_id": COURSE_VERSION_ID, "level": "intro", "participant_name": "Test Learner",
        "score": 12, "total": 15, "pct": 80, "passed": True,
        "started_at": datetime.now(timezone.utc).isoformat(),
    }
    body.update(overrides)
    return body


def test_quiz_questions_requires_auth(client):
    resp = client.get("/quiz-questions", params={"level": "intro"})
    assert resp.status_code == 401


def test_quiz_questions_returned_when_signed_in(client, auth_headers):
    _add_question()
    resp = client.get("/quiz-questions", params={"level": "intro"}, headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 1
    # Deliberately included, not stripped out — see the comment on
    # QuizQuestionOut in app/schemas.py for why this is correct, not a leak.
    assert body[0]["correct_index"] == 1


def test_invalid_level_rejected(client, auth_headers):
    resp = client.get("/quiz-questions", params={"level": "expert"}, headers=auth_headers)
    assert resp.status_code == 400


def test_create_and_list_attempt(client, auth_headers):
    resp = client.post("/attempts", headers=auth_headers, json=_attempt_body())
    assert resp.status_code == 201
    attempt = resp.json()
    assert attempt["passed"] is True
    assert attempt["course_version"]["course"]["title"] == "IEC 62304 Essentials"

    resp = client.get("/attempts/me", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_client_supplied_attempt_id_is_kept(client, auth_headers):
    """See the long comment on QuizAttempt.id in models.py: quiz.js
    generates this id itself before saving, so the certificate can show a
    real id instantly. This is the one thing that must never regress."""
    cert_id = str(uuid.uuid4())
    resp = client.post("/attempts", headers=auth_headers, json=_attempt_body(id=cert_id))
    assert resp.status_code == 201
    assert resp.json()["id"] == cert_id


def test_attempts_require_auth(client):
    resp = client.post("/attempts", json=_attempt_body())
    assert resp.status_code == 401
