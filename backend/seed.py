# ============================================================
# seed.py — one-time (safe to re-run) load of reference data
# ============================================================
# Run with:  python seed.py   (from inside backend/, with .env set up and
# `alembic upgrade head` already applied)
#
# WHAT THIS DOES, IN PLAIN TERMS
# Creates the one course + course version this site teaches, then loads its
# 30 quiz questions out of ../data/questions-intro.json and
# ../data/questions-advanced.json — the exact same two files quiz.js used to
# fetch directly. This backend serves them from the database instead (see
# routers/quiz.py), which is why they need loading in here first.
#
# Uses the SAME fixed UUIDs supabase/schema.sql seeded before — not a
# coincidence: it means quiz.js's existing COURSE_VERSION_ID constant needs
# no change at all once it's pointed at this API instead of Supabase.
# Every insert checks "does this already exist?" first, so running this
# twice is harmless rather than erroring on a duplicate.
import json
from pathlib import Path

from app.database import SessionLocal
from app.models import Course, CourseVersion, QuizQuestion

COURSE_ID = "11111111-1111-1111-1111-111111111111"
COURSE_VERSION_ID = "22222222-2222-2222-2222-222222222222"

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
QUESTION_FILES = {
    "intro": DATA_DIR / "questions-intro.json",
    "advanced": DATA_DIR / "questions-advanced.json",
}


def seed():
    db = SessionLocal()
    try:
        course = db.get(Course, COURSE_ID)
        if course is None:
            course = Course(
                id=COURSE_ID,
                slug="iec-62304-essentials",
                title="IEC 62304 Essentials",
                description="Medical device software lifecycle training, based on IEC 62304:2006+AMD1:2015.",
            )
            db.add(course)
            print("Created course: IEC 62304 Essentials")

        version = db.get(CourseVersion, COURSE_VERSION_ID)
        if version is None:
            version = CourseVersion(
                id=COURSE_VERSION_ID,
                course_id=COURSE_ID,
                version_label="Edition 1 - 2006+A1:2015",
                is_current=True,
            )
            db.add(version)
            print("Created course version: Edition 1 - 2006+A1:2015")

        db.commit()

        existing_count = db.query(QuizQuestion).filter(QuizQuestion.course_version_id == COURSE_VERSION_ID).count()
        if existing_count > 0:
            print(f"quiz_questions already has {existing_count} rows for this course version — skipping question load.")
            print("(Delete them first, or point at a fresh database, to reload from the JSON files.)")
            return

        for level, path in QUESTION_FILES.items():
            questions = json.loads(path.read_text(encoding="utf-8"))
            for sort_order, q in enumerate(questions):
                db.add(QuizQuestion(
                    course_version_id=COURSE_VERSION_ID,
                    level=level,
                    question=q["q"],
                    options=q["options"],
                    correct_index=q["correct"],
                    explanation=q["explanation"],
                    sort_order=sort_order,
                ))
            print(f"Loaded {len(questions)} '{level}' questions from {path.name}")

        db.commit()
        print("Seed complete.")

    finally:
        db.close()


if __name__ == "__main__":
    seed()
