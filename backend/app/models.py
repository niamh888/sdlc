# ============================================================
# models.py — every table this project owns, as SQLAlchemy ORM classes
# ============================================================
#
# WHAT AN "ORM MODEL" ACTUALLY IS
# Each class below is BOTH a normal Python class AND a description of one
# Postgres table — every `Mapped[...]` attribute is one column. That's what
# "Object-Relational Mapping" means: SQLAlchemy translates
# `db.add(QuizAttempt(...))` into the right INSERT statement, and
# `db.query(QuizAttempt).where(...)` into the right SELECT, so the rest of
# this app just creates and reads ordinary Python objects — raw SQL becomes
# an implementation detail hidden in this one layer instead of scattered
# through every route.
#
# This mirrors supabase/schema.sql's tables closely ON PURPOSE — same names,
# same columns, same relationships. What's different is WHO enforces the
# rules. schema.sql used Postgres Row Level Security policies running
# INSIDE the database (e.g. "a user may only read their own quiz_attempts
# rows"). Here, the same rule is enforced in Python, in routers/*.py, by
# only ever querying with an explicit `.where(QuizAttempt.user_id ==
# current_user.id)` — see each router's own comments for exactly where that
# check happens. There is no database-level safety net this time, which is
# a real trade-off worth naming honestly: it means every route that touches
# another user's data has to get its own filtering right, rather than being
# unable to get it wrong even by accident the way RLS made impossible.
#
# WHY IDS ARE `String`, NOT SQLALCHEMY'S `Uuid` TYPE
# SQLAlchemy 2.0 has a dedicated Uuid column type, which sounds like the
# "proper" choice — but it expects real `uuid.UUID` Python objects on the
# way in, and quietly breaks (an AttributeError, discovered while first
# testing this file) the moment a plain string slips through instead, which
# happens constantly in practice: every id arriving from the API is a JSON
# string, and this project's own fixed ids (seed.py's COURSE_ID, for
# instance) are written as plain strings too. Storing ids as an ordinary
# String column sidesteps that trap entirely, behaves IDENTICALLY on SQLite
# and Postgres, and loses nothing that matters here — FastAPI's Pydantic
# schemas (see schemas.py) still validate every id as a real UUID at the
# API boundary, which is the only place that validation actually earns its
# keep.
from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from .database import Base


def new_id() -> str:
    """The default for every primary key below — a random UUID4, formatted
    as its canonical 36-character string. A plain function (not a lambda)
    so it shows up with a readable name in stack traces."""
    return str(uuid.uuid4())


class User(Base):
    """Replaces Supabase Auth's `auth.users` table — this project now owns
    accounts entirely. `password_hash` is a bcrypt hash (see security.py),
    never the plain password itself; nothing in this codebase ever stores
    or logs a real password."""
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    full_name: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    attempts: Mapped[list["QuizAttempt"]] = relationship(back_populates="user")
    reviews: Mapped[list["CourseReview"]] = relationship(back_populates="user")


class Course(Base):
    """One row per course. Same reasoning as schema.sql's own comment: this
    is meant to grow beyond IEC 62304 one day, so a second course is just a
    second row here, not a schema change."""
    __tablename__ = "courses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    slug: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    versions: Mapped[list["CourseVersion"]] = relationship(back_populates="course")
    reviews: Mapped[list["CourseReview"]] = relationship(back_populates="course")


class CourseVersion(Base):
    """A course can have more than one version over time (e.g. a future
    IEC 62304 Edition 2 course). Quiz questions belong to a VERSION, not
    directly to a course, so two editions never mix their question banks."""
    __tablename__ = "course_versions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    course_id: Mapped[str] = mapped_column(String(36), ForeignKey("courses.id", ondelete="CASCADE"))
    version_label: Mapped[str] = mapped_column(String, nullable=False)
    is_current: Mapped[bool] = mapped_column(Boolean, default=False)
    effective_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    course: Mapped["Course"] = relationship(back_populates="versions")
    questions: Mapped[list["QuizQuestion"]] = relationship(back_populates="course_version")
    attempts: Mapped[list["QuizAttempt"]] = relationship(back_populates="course_version")


class QuizQuestion(Base):
    """Replaces data/questions-intro.json / data/questions-advanced.json —
    see seed.py for the one-time load out of those files. `options` is a
    JSON array of the (always 4, today) answer strings — the same shape
    quiz.js already works with."""
    __tablename__ = "quiz_questions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    course_version_id: Mapped[str] = mapped_column(String(36), ForeignKey("course_versions.id", ondelete="CASCADE"))
    level: Mapped[str] = mapped_column(String, nullable=False)  # 'intro' | 'advanced'
    question: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    correct_index: Mapped[int] = mapped_column(Integer, nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    course_version: Mapped["CourseVersion"] = relationship(back_populates="questions")


class QuizAttempt(Base):
    """One row per completed (or abandoned) quiz attempt.

    `id` is usually supplied BY THE CLIENT rather than left to the default
    below — quiz.js generates it the moment the quiz starts (via
    crypto.randomUUID()) specifically so the certificate can show a real,
    working Certificate ID the instant someone passes, without waiting on
    this row to actually finish saving (or even succeed — see
    routers/quiz.py and quiz.js's own comments on quizState.attemptId for
    the full reasoning). The Python-side default here only matters for the
    rare case nothing was supplied."""
    __tablename__ = "quiz_attempts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"))
    course_version_id: Mapped[str] = mapped_column(String(36), ForeignKey("course_versions.id"))
    level: Mapped[str] = mapped_column(String, nullable=False)
    participant_name: Mapped[str] = mapped_column(String, nullable=False)
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    total: Mapped[int] = mapped_column(Integer, nullable=False)
    pct: Mapped[int] = mapped_column(Integer, nullable=False)
    passed: Mapped[bool] = mapped_column(Boolean, nullable=False)
    started_at: Mapped[datetime] = mapped_column(nullable=False)
    completed_at: Mapped[datetime] = mapped_column(server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="attempts")
    course_version: Mapped["CourseVersion"] = relationship(back_populates="attempts")
    answers: Mapped[list["QuizAttemptAnswer"]] = relationship(back_populates="attempt")


class QuizAttemptAnswer(Base):
    """One row per question answered within an attempt. Modelled here for
    parity with the old schema but — same as before this migration — no
    route writes to it yet. It costs nothing to keep and means a future
    'review your answers' feature needs no schema change when it's built."""
    __tablename__ = "quiz_attempt_answers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    attempt_id: Mapped[str] = mapped_column(String(36), ForeignKey("quiz_attempts.id", ondelete="CASCADE"))
    question_id: Mapped[str] = mapped_column(String(36), ForeignKey("quiz_questions.id"))
    selected_index: Mapped[int] = mapped_column(Integer, nullable=False)
    correct: Mapped[bool] = mapped_column(Boolean, nullable=False)

    attempt: Mapped["QuizAttempt"] = relationship(back_populates="answers")


class CourseReview(Base):
    """A participant review, shown publicly once status == 'approved' — see
    routers/reviews.py for who can see/write what, and admin.py for how
    Niamh moderates these (this replaces Supabase's Table Editor)."""
    __tablename__ = "course_reviews"
    __table_args__ = (UniqueConstraint("user_id", "course_id", name="uq_user_course_review"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"))
    course_id: Mapped[str] = mapped_column(String(36), ForeignKey("courses.id", ondelete="CASCADE"))
    participant_name: Mapped[str] = mapped_column(String, nullable=False)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String, default="pending")  # 'pending' | 'approved' | 'rejected'
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="reviews")
    course: Mapped["Course"] = relationship(back_populates="reviews")
