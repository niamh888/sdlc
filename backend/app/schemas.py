# ============================================================
# schemas.py — Pydantic models describing exactly what each API request
# must contain, and exactly what each response looks like
# ============================================================
#
# WHY THIS IS A SEPARATE FILE FROM models.py
# models.py describes the DATABASE. This file describes the API's OWN
# contract — deliberately not the same thing. A signup request, for
# instance, has a `password` field that a User row never stores (only its
# hash) and a user response never returns `password_hash` even though the
# User model has that column. Every route below declares
# `response_model=SomeSchema`, which is what makes returning a raw ORM
# object safe: FastAPI filters it through that schema on the way out, so a
# field simply not listed here can never leak into a response by accident —
# the same "only send what's meant to be public" guarantee Supabase's RLS
# select policies used to provide, enforced here instead.
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ---------- AUTH ----------

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    email: EmailStr
    full_name: str | None = None


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)  # matches the frontend's own validatePasswordField() in login.js
    full_name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    user: UserOut


# ---------- QUIZ QUESTIONS ----------

class QuizQuestionOut(BaseModel):
    """Deliberately includes correct_index and explanation — NOT a security
    hole, a conscious carry-over: quiz.js has always graded each answer
    entirely client-side the instant someone clicks (see selectAnswer() in
    quiz.js), so the correct answer already had to be sent to the browser
    up front even when this data lived in a static JSON file. Requiring
    sign-in to reach this endpoint (see routers/quiz.py) is what stops the
    question bank being scraped anonymously — the same job the "readable
    when signed in" RLS policy did before."""
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    question: str
    options: list[str]
    correct_index: int
    explanation: str


# ---------- QUIZ ATTEMPTS ----------

class AttemptCreate(BaseModel):
    # Optional and client-suppliable — see the long comment on
    # QuizAttempt.id in models.py for why quiz.js generates this itself
    # before the attempt is even saved.
    id: uuid.UUID | None = None
    course_version_id: uuid.UUID
    level: str
    participant_name: str
    score: int
    total: int
    pct: int
    passed: bool
    started_at: datetime


class _CourseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    title: str


class _CourseVersionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    version_label: str
    course: _CourseOut


class AttemptOut(BaseModel):
    """What GET /attempts/me returns — one row per past attempt, course and
    version details already nested in (a SQLAlchemy joinedload in
    routers/quiz.py does the join), same one-request shape the frontend's
    PostgREST foreign-key embed used to give my-results.js."""
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    level: str
    participant_name: str
    score: int
    total: int
    pct: int
    passed: bool
    started_at: datetime
    completed_at: datetime
    course_version: _CourseVersionOut


# ---------- CERTIFICATE VERIFICATION ----------

class CertificateOut(BaseModel):
    """What GET /certificates/{id}/verify returns — deliberately only these
    fields (never user_id, email, or anything else about the account), and
    only ever for a PASSED attempt. Mirrors exactly what Supabase's
    verify_certificate() SQL function used to expose, for the same reasons —
    see routers/certificates.py."""
    participant_name: str
    level: str
    score: int
    total: int
    pct: int
    completed_at: datetime
    course_title: str
    version_label: str


# ---------- COURSE REVIEWS ----------

class ReviewCreate(BaseModel):
    course_id: uuid.UUID
    participant_name: str
    rating: int = Field(ge=1, le=5)
    comment: str


class ReviewOut(BaseModel):
    """A PUBLIC review — no user_id, no status, nothing beyond what a
    visitor is meant to see. Used by GET /reviews."""
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    participant_name: str
    rating: int
    comment: str
    created_at: datetime


class ReviewStatusOut(BaseModel):
    """What GET /reviews/me returns — the caller's OWN review, status
    included, so the frontend can show 'awaiting approval' the same way
    reviews.js already does."""
    model_config = ConfigDict(from_attributes=True)
    rating: int
    comment: str
    status: str
