# ============================================================
# routers/certificates.py — GET /certificates/{attempt_id}/verify
# ============================================================
# Replaces Supabase's verify_certificate() SQL function. PUBLIC — no
# sign-in required, on purpose: an employer or auditor checking a
# certificate they were handed will usually not have (and should not need)
# an account on this site at all. Safe to leave open because it takes the
# id as a REQUIRED path parameter and returns at most one row — there is no
# way to call this with no filter and list everyone's certificates, the way
# an unrestricted GET /quiz_attempts would.
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..models import CourseVersion, QuizAttempt
from ..schemas import CertificateOut

router = APIRouter(prefix="/certificates", tags=["certificates"])


@router.get("/{attempt_id}/verify", response_model=CertificateOut)
def verify_certificate(attempt_id: uuid.UUID, db: Session = Depends(get_db)):
    attempt = db.scalar(
        select(QuizAttempt)
        .options(joinedload(QuizAttempt.course_version).joinedload(CourseVersion.course))
        # str(attempt_id): the id column is a plain String, not SQLAlchemy's
        # Uuid type — see the note at the top of models.py.
        .where(QuizAttempt.id == str(attempt_id), QuizAttempt.passed.is_(True))
    )
    if attempt is None:
        # The same "not found" response whether the id is simply wrong OR
        # belongs to a real but FAILED attempt — a wrong id and a real
        # failed one must look identical here, exactly like the old SQL
        # function: only a pass ever produced a certificate to verify in
        # the first place, so there is no honest way to distinguish them
        # that doesn't leak whether someone failed.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No certificate found with that ID.")

    return CertificateOut(
        participant_name=attempt.participant_name,
        level=attempt.level,
        score=attempt.score,
        total=attempt.total,
        pct=attempt.pct,
        completed_at=attempt.completed_at,
        course_title=attempt.course_version.course.title,
        version_label=attempt.course_version.version_label,
    )
