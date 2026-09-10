# ============================================================
# admin.py — the /admin review-moderation panel
# ============================================================
# Replaces Supabase's Table Editor, which was how Niamh approved/rejected
# course reviews before (flip a row's `status` between pending/approved/
# rejected — see routers/reviews.py). SQLAdmin auto-generates a working
# CRUD UI straight from the SQLAlchemy models in models.py, so this file is
# mostly just deciding what each ModelView is and isn't allowed to touch,
# not building any UI by hand.
from sqladmin import Admin, ModelView
from sqladmin.authentication import AuthenticationBackend
from starlette.requests import Request

from .config import settings
from .database import engine
from .models import CourseReview, QuizAttempt, User


class AdminAuth(AuthenticationBackend):
    """A single hardcoded username/password pair (see .env's ADMIN_USERNAME/
    ADMIN_PASSWORD) — there is no admin sign-up anywhere in this project.
    Session-cookie based (via Starlette's SessionMiddleware, wired up in
    main.py), which is the normal, traditional way to protect a
    server-rendered admin panel like this one — a different mechanism from
    the JWT bearer tokens the public API routes use, and that's fine: they
    protect two different things."""

    async def login(self, request: Request) -> bool:
        form = await request.form()
        username, password = form.get("username"), form.get("password")
        if username == settings.admin_username and password == settings.admin_password:
            request.session.update({"admin": True})
            return True
        return False

    async def logout(self, request: Request) -> bool:
        request.session.clear()
        return True

    async def authenticate(self, request: Request) -> bool:
        return bool(request.session.get("admin"))


class CourseReviewAdmin(ModelView, model=CourseReview):
    """The main reason this admin panel exists. can_create=False because a
    review should only ever be born through the public POST /reviews route
    (as a real participant's real submission) — never manufactured here.
    form_columns restricts the edit form to JUST `status`, so moderating a
    review means choosing approved/pending/rejected, never quietly rewriting
    what someone actually said."""
    column_list = [
        CourseReview.id, CourseReview.participant_name, CourseReview.rating,
        CourseReview.comment, CourseReview.status, CourseReview.created_at,
    ]
    column_default_sort = [(CourseReview.created_at, True)]
    column_searchable_list = [CourseReview.participant_name, CourseReview.comment]
    column_sortable_list = [CourseReview.status, CourseReview.rating, CourseReview.created_at]
    form_columns = [CourseReview.status]
    can_create = False
    name = "Review"
    name_plural = "Reviews"
    icon = "fa-solid fa-star"


class UserAdmin(ModelView, model=User):
    """Read-only — this panel is for moderating reviews, not for editing
    accounts by hand. Listed mainly so Niamh can see who has signed up."""
    column_list = [User.id, User.email, User.full_name, User.created_at]
    can_create = False
    can_edit = False
    can_delete = False
    name = "User"
    name_plural = "Users"
    icon = "fa-solid fa-user"


class QuizAttemptAdmin(ModelView, model=QuizAttempt):
    """Also read-only, for visibility only — same data my-results.js shows
    a signed-in learner about themselves, viewable here across everyone."""
    column_list = [
        QuizAttempt.id, QuizAttempt.participant_name, QuizAttempt.level,
        QuizAttempt.pct, QuizAttempt.passed, QuizAttempt.completed_at,
    ]
    column_default_sort = [(QuizAttempt.completed_at, True)]
    can_create = False
    can_edit = False
    can_delete = False
    name = "Quiz Attempt"
    name_plural = "Quiz Attempts"
    icon = "fa-solid fa-clipboard-check"


def register_admin(app) -> Admin:
    admin = Admin(app, engine, authentication_backend=AdminAuth(secret_key=settings.session_secret))
    admin.add_view(CourseReviewAdmin)
    admin.add_view(UserAdmin)
    admin.add_view(QuizAttemptAdmin)
    return admin
