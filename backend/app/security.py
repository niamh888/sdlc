# ============================================================
# security.py — password hashing and JWT issuing/verification
# ============================================================
#
# WHAT REPLACES WHAT
# Supabase Auth used to do all of this invisibly. Now this project does it
# explicitly, in two separate halves:
#
#   * PASSWORDS are never stored — only a bcrypt HASH of one. bcrypt is
#     deliberately slow: cheap enough to check one password at login, slow
#     enough that trying millions of guesses against a stolen hash takes
#     meaningfully long. A fast hash like SHA-256 would be the wrong tool
#     here for exactly that reason — speed is the whole threat.
#
#   * A JWT (JSON Web Token) is a signed, tamper-evident string that proves
#     "this is user X, and this server said so before some expiry time."
#     The frontend stores it (see auth.js) and sends it back as
#     `Authorization: Bearer <token>` on every request that needs to know
#     who's asking. This file is what CREATES that token at login and
#     DECODES + VERIFIES it on every later request — get_current_user()
#     below is the one place "is this request really from this user"
#     actually gets decided.
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from .models import User

# auto_error=False: a request with no Authorization header at all should be
# treated as "signed out", not blow up before get_current_user_optional()
# even gets a chance to say that's fine.
bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def create_access_token(user_id: uuid.UUID) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expires_minutes)
    payload = {"sub": str(user_id), "exp": expires_at}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """FastAPI dependency every PROTECTED route declares as
    `user: User = Depends(get_current_user)`. Every router trusts this one
    function rather than re-checking tokens itself — the same way every
    page on the old site trusted auth.js's getCurrentSession() instead of
    each re-implementing session checking on its own."""
    unauthorized = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not signed in.")
    if credentials is None:
        raise unauthorized
    try:
        payload = jwt.decode(credentials.credentials, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        # Round-tripped through uuid.UUID() and back to str() rather than
        # used as a bare string straight from the token: this still
        # validates that `sub` is a well-formed UUID (a malformed one
        # raises ValueError, caught below) before it ever reaches a
        # database query — str(user_id) is what actually gets used, since
        # User.id is a plain String column, not SQLAlchemy's Uuid type
        # (see the note at the top of models.py).
        user_id = str(uuid.UUID(payload["sub"]))
    except (jwt.PyJWTError, KeyError, ValueError) as exc:
        # Covers an expired token, a forged/corrupted one, and a well-formed
        # token whose `sub` isn't even a valid UUID — all three mean the
        # same thing to the caller: you are not signed in, try again.
        raise unauthorized from exc

    user = db.get(User, user_id)
    if user is None:
        # A valid signature for a user that no longer exists (deleted
        # account, token from a wiped dev database) — still just "not
        # signed in" from the caller's point of view.
        raise unauthorized
    return user


def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User | None:
    """Same idea as get_current_user, but returns None instead of raising
    401 when signed out — for routes like GET /reviews that behave sensibly
    either way (a signed-out visitor still sees approved reviews; a signed-in
    one also gets to see their own pending one) rather than requiring
    sign-in just to read."""
    if credentials is None:
        return None
    try:
        return get_current_user(credentials, db)
    except HTTPException:
        return None
