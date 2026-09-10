import uuid
from datetime import datetime, timezone

from .conftest import COURSE_VERSION_ID


def _attempt_body(**overrides):
    body = {
        "course_version_id": COURSE_VERSION_ID, "level": "intro", "participant_name": "Test Learner",
        "score": 15, "total": 15, "pct": 100, "passed": True,
        "started_at": datetime.now(timezone.utc).isoformat(),
    }
    body.update(overrides)
    return body


def test_verify_unknown_id_returns_404(client):
    resp = client.get(f"/certificates/{uuid.uuid4()}/verify")
    assert resp.status_code == 404


def test_verify_passed_attempt_needs_no_auth(client, auth_headers):
    cert_id = str(uuid.uuid4())
    client.post("/attempts", headers=auth_headers, json=_attempt_body(id=cert_id))

    # No headers — verifying a certificate must work while signed out.
    resp = client.get(f"/certificates/{cert_id}/verify")
    assert resp.status_code == 200
    body = resp.json()
    assert body["participant_name"] == "Test Learner"
    assert body["course_title"] == "IEC 62304 Essentials"
    assert body["version_label"] == "Edition 1"


def test_verify_failed_attempt_returns_404_not_the_score(client, auth_headers):
    """A failed attempt is a real row, but must be indistinguishable from a
    made-up id — otherwise this endpoint would leak who failed."""
    cert_id = str(uuid.uuid4())
    client.post("/attempts", headers=auth_headers, json=_attempt_body(
        id=cert_id, score=5, total=15, pct=33, passed=False,
    ))
    resp = client.get(f"/certificates/{cert_id}/verify")
    assert resp.status_code == 404
