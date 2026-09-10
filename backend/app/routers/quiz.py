# ============================================================
# routers/quiz.py — GET /quiz-questions, POST /attempts, GET /attempts/me
# ============================================================
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload
from fastapi import APIRouter, Depends, HTTPException, status

from ..database import get_db
from ..models import CourseVersion, QuizAttempt, QuizQuestion, User, new_id
from ..schemas import AttemptCreate, AttemptOut, QuizQuestionOut
from ..security import get_current_user

router = APIRouter(tags=["quiz"])

# The one course_version this site currently teaches — same fixed-constant
# reasoning quiz.js's own COURSE_VERSION_ID uses: it avoids a lookup query
# just to find out what it is. seed.py creates this exact row.
CURRENT_COURSE_VERSION_ID = "22222222-2222-2222-2222-222222222222"


@router.get("/quiz-questions", response_model=list[QuizQuestionOut])
def list_quiz_questions(level: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Requires sign-in (current_user is a required dependency, unused
    beyond that) for the same reason the old RLS policy did: login is
    already required to reach the quiz in the UI, and this makes that a
    real guarantee rather than a UI-only one, so the question bank cannot
    be scraped anonymously."""
    if level not in ("intro", "advanced"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="level must be 'intro' or 'advanced'")

    rows = db.scalars(
        select(QuizQuestion)
        .where(QuizQuestion.course_version_id == CURRENT_COURSE_VERSION_ID, QuizQuestion.level == level)
        .order_by(QuizQuestion.sort_order)
    ).all()
    return rows


@router.post("/attempts", response_model=AttemptOut, status_code=status.HTTP_201_CREATED)
def create_attempt(body: AttemptCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Saves a completed attempt. `body.id` is usually already set by the
    client (see the long comment on QuizAttempt.id in models.py) — passing
    it straight into the model constructor below means the same id that's
    already on screen as the Certificate ID becomes this row's real primary
    key, with no separate 'now tell the client what id you gave it' step
    needed."""
    # Pydantic parses body.id / body.course_version_id as real uuid.UUID
    # objects (that's what makes FastAPI reject a malformed id with a clean
    # 422 instead of this ever reaching the database) — converted to str()
    # here because the ORM columns themselves are plain strings, not
    # SQLAlchemy's Uuid type. See the long comment at the top of models.py
    # for why.
    attempt = QuizAttempt(
        id=str(body.id) if body.id else new_id(),
        user_id=current_user.id,
        course_version_id=str(body.course_version_id),
        level=body.level,
        participant_name=body.participant_name,
        score=body.score,
        total=body.total,
        pct=body.pct,
        passed=body.passed,
        started_at=body.started_at,
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    # Re-fetch with the join eager-loaded so the response has course/version
    # details attached, same shape GET /attempts/me returns — see that
    # route below for why joinedload is used instead of two separate
    # queries.
    attempt = db.scalar(
        select(QuizAttempt)
        .options(joinedload(QuizAttempt.course_version).joinedload(CourseVersion.course))
        .where(QuizAttempt.id == attempt.id)
    )
    return attempt


@router.get("/attempts/me", response_model=list[AttemptOut])
def list_my_attempts(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Powers the My Results page. joinedload(...).joinedload(...) tells
    SQLAlchemy to fetch each attempt's course_version AND that version's
    course in the SAME query (one SQL JOIN, not N+1 separate ones) — the
    ORM's equivalent of the foreign-key embed PostgREST used to do
    automatically for my-results.js's nested `course_versions(...,
    courses(...))` select."""
    rows = db.scalars(
        select(QuizAttempt)
        .options(joinedload(QuizAttempt.course_version).joinedload(CourseVersion.course))
        .where(QuizAttempt.user_id == current_user.id)
        .order_by(QuizAttempt.completed_at.desc())
    ).all()
    return rows
