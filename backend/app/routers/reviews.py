# ============================================================
# routers/reviews.py — GET /reviews, GET /reviews/me, POST /reviews
# ============================================================
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import CourseReview, User
from ..schemas import ReviewCreate, ReviewOut, ReviewStatusOut
from ..security import get_current_user

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.get("", response_model=list[ReviewOut])
def list_approved_reviews(course_id: uuid.UUID, db: Session = Depends(get_db)):
    """PUBLIC — no sign-in required. Only ever returns status='approved'
    rows; this WHERE clause is the entire enforcement of that rule now that
    there is no RLS policy doing it at the database level, so it must never
    be dropped or loosened here."""
    rows = db.scalars(
        select(CourseReview)
        # str(course_id): the column is a plain String, not SQLAlchemy's
        # Uuid type — see the note at the top of models.py.
        .where(CourseReview.course_id == str(course_id), CourseReview.status == "approved")
        .order_by(CourseReview.created_at.desc())
        .limit(12)
    ).all()
    return rows


@router.get("/me", response_model=ReviewStatusOut | None)
def my_review(course_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """The caller's OWN review for this course, regardless of status — lets
    reviews.js show 'awaiting approval' instead of the review just
    silently not appearing. None (empty body) when they haven't left one
    yet — the normal case for a first-time visitor, not an error."""
    review = db.scalar(
        select(CourseReview).where(CourseReview.course_id == str(course_id), CourseReview.user_id == current_user.id)
    )
    return review


@router.post("", response_model=ReviewOut, status_code=status.HTTP_201_CREATED)
def create_review(body: ReviewCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """status is never taken from the request — every new review is
    'pending' by the column's own default (see models.py), full stop.
    Approving one only ever happens through the SQLAdmin panel (admin.py),
    which replaces Supabase's Table Editor for exactly this job."""
    review = CourseReview(
        user_id=current_user.id,
        course_id=str(body.course_id),
        participant_name=body.participant_name,
        rating=body.rating,
        comment=body.comment,
    )
    db.add(review)
    try:
        db.commit()
    except IntegrityError as exc:
        # The unique(user_id, course_id) constraint in models.py — one
        # review per person per course. A second attempt to insert is a
        # normal, expected outcome here (they already left one), not a
        # server error.
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="You have already reviewed this course."
        ) from exc
    db.refresh(review)
    return review
