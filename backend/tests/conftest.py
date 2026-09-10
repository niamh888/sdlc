# ============================================================
# conftest.py — shared pytest fixtures: a real in-memory database and a
# FastAPI TestClient wired to use it instead of whatever DATABASE_URL says
# ============================================================
import os

# Fake values for every setting config.py leaves REQUIRED (no default) —
# this lets `app.config.Settings()` import successfully during a test run
# with no real .env file present at all. None of these values are used for
# anything real; they only satisfy pydantic-settings' "must be provided"
# check. Must be set BEFORE any `from app...` import below, since that's
# the moment Settings() actually reads the environment.
os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret-long-enough-to-avoid-the-insecure-key-length-warning")
os.environ.setdefault("ADMIN_USERNAME", "admin")
os.environ.setdefault("ADMIN_PASSWORD", "test-admin-password")
os.environ.setdefault("SESSION_SECRET", "test-session-secret")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models import Course, CourseVersion

# ONE shared in-memory SQLite connection for the whole test run.
# StaticPool is what makes that true — plain SQLite in-memory otherwise
# hands out a brand new, empty database to every new connection, which
# would mean the app and the test itself were never even looking at the
# same data.
test_engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestSessionLocal = sessionmaker(bind=test_engine)

# Same fixed ids seed.py uses in the real database — tests exercise the
# same "one course, one version" shape production data actually has.
COURSE_ID = "11111111-1111-1111-1111-111111111111"
COURSE_VERSION_ID = "22222222-2222-2222-2222-222222222222"


def _override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


# Swaps out the real get_db dependency everywhere the app uses it — every
# route under test talks to the in-memory test database without any of
# them, or this file's tests, needing to know that swap happened.
app.dependency_overrides[get_db] = _override_get_db


@pytest.fixture(autouse=True)
def _fresh_database():
    """Runs before EVERY test automatically (autouse=True): rebuilds every
    table from scratch and seeds the one course/version row, so no test can
    see another test's leftover data and no test has to clean up after
    itself."""
    Base.metadata.create_all(bind=test_engine)
    db = TestSessionLocal()
    db.add(Course(id=COURSE_ID, slug="iec-62304-essentials", title="IEC 62304 Essentials"))
    db.add(CourseVersion(id=COURSE_VERSION_ID, course_id=COURSE_ID, version_label="Edition 1", is_current=True))
    db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def auth_headers(client):
    """Signs up one fresh test learner and returns headers ready to use on
    any protected route — most tests need a signed-in user and shouldn't
    each have to repeat the signup dance to get one."""
    resp = client.post("/auth/signup", json={
        "email": "learner@example.com", "password": "password123", "full_name": "Test Learner",
    })
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
