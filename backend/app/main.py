# ============================================================
# main.py — the FastAPI app itself: CORS, middleware, and every router
# ============================================================
# This is the file `uvicorn app.main:app` actually runs. Everything it does
# is wiring already-built pieces together — the real logic lives in
# routers/*.py, models.py, security.py and admin.py.
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from .admin import register_admin
from .config import settings
from .routers import auth, certificates, quiz, reviews

app = FastAPI(
    title="IEC 62304 Training API",
    description="Backend for the IEC 62304 SDLC Training site — accounts, quiz attempts, certificate "
                 "verification and course reviews. See /docs for the interactive API explorer.",
)

# Only the frontend origins listed in CORS_ORIGINS (see config.py/.env) may
# call this API from a browser — everything else is blocked by the browser
# itself before a response is even read. allow_credentials is NOT set: the
# public routes use a bearer token in the Authorization header, not cookies,
# so there is nothing cross-origin-cookie-shaped to allow.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Required by the /admin panel's session-cookie login (see admin.py) — a
# separate mechanism from the JWT bearer auth the API routes below use.
app.add_middleware(SessionMiddleware, secret_key=settings.session_secret)

app.include_router(auth.router)
app.include_router(quiz.router)
app.include_router(certificates.router)
app.include_router(reviews.router)

register_admin(app)


@app.get("/health", tags=["health"])
def health():
    """Cheap, no-auth endpoint that just confirms the process is up —
    useful for Render's own health checks once deployed, and for a quick
    'is this actually running' check while developing locally."""
    return {"status": "ok"}
