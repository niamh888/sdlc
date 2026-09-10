# ============================================================
# routers/auth.py — POST /auth/signup, POST /auth/login, GET /auth/me
# ============================================================
# Replaces Supabase Auth's signUp()/signInWithPassword()/getSession(), which
# auth.js used to call directly from the browser. Deliberately NO email
# confirmation step — a signup here is active immediately, sidestepping the
# Resend SMTP problem entirely rather than reimplementing it (see this
# project's memory notes on that saga).
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..schemas import LoginRequest, SignupRequest, TokenResponse, UserOut
from ..security import create_access_token, get_current_user, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup(body: SignupRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == body.email).first()
    if existing is not None:
        # Same wording friendlyAuthError() in login.js already expects from
        # Supabase's "User already registered" — kept identical so that
        # existing frontend error-message mapping keeps working unchanged.
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already registered")

    user = User(email=body.email, password_hash=hash_password(body.password), full_name=body.full_name)
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if user is None or not verify_password(body.password, user.password_hash):
        # Same message whether the email doesn't exist or the password is
        # wrong — telling the two apart would let an attacker use this
        # endpoint to discover which email addresses have accounts.
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid login credentials")

    token = create_access_token(user.id)
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    """What auth.js's getCurrentSession() calls on page load to check
    whether the stored token is still good — a token can exist in
    localStorage and still be expired or otherwise invalid, so this is a
    real server round trip, not just decoding the token in the browser."""
    return current_user
