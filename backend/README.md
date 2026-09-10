# IEC 62304 Training API

The backend for the [sdlc_training](..) site — Python, FastAPI, SQLAlchemy.
Replaces the Supabase project the frontend used to talk to directly: this
project now owns its own database, its own accounts, and its own REST API.
See `../supabase/schema.sql` for the old, now-superseded version of this
same data model, and the plan this was built from for the full reasoning
behind every decision here.

## First-time setup

1. **Create a virtual environment** (from this `backend/` folder):
   ```
   python -m venv venv
   venv\Scripts\activate          (Windows)   or   source venv/bin/activate   (Mac/Linux)
   pip install -r requirements.txt
   ```
2. **Create `.env`** — copy `.env.example` to `.env` in this same folder and fill in real values (a Neon `DATABASE_URL`, a generated `JWT_SECRET`, an `ADMIN_PASSWORD` you choose, a generated `SESSION_SECRET`). `.env.example` explains each one. `.env` is gitignored — it never gets committed, and its real values never need to be shared outside your own editor.
3. **Create the database tables:**
   ```
   alembic upgrade head
   ```
4. **Load the quiz questions and course data:**
   ```
   python seed.py
   ```
   Safe to re-run — it checks what already exists before inserting anything.
5. **Run it:**
   ```
   uvicorn app.main:app --reload
   ```
   Then open **http://127.0.0.1:8000/docs** — FastAPI's interactive Swagger UI. Every endpoint below can be tried directly from that page, including signing up, logging in, and using the "Authorize" button to try an authenticated request with the token you got back.

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/signup` | — | Create an account, get a token back immediately (no email confirmation) |
| POST | `/auth/login` | — | Get a token for an existing account |
| GET | `/auth/me` | bearer | Check the current token is still valid, get the account it belongs to |
| GET | `/quiz-questions?level=intro\|advanced` | bearer | The question set for one level |
| POST | `/attempts` | bearer | Save a completed quiz attempt |
| GET | `/attempts/me` | bearer | Every attempt the signed-in user has made, most recent first |
| GET | `/certificates/{id}/verify` | — | Confirm a certificate is real (public, no sign-in) |
| GET | `/reviews?course_id=...` | — | Approved course reviews (public) |
| GET | `/reviews/me?course_id=...` | bearer | The signed-in user's own review, any status |
| POST | `/reviews` | bearer | Submit a review (always starts `pending`) |
| GET | `/admin` | admin login | Moderate reviews — approve/reject — see below |
| GET | `/health` | — | Is the API up |

## Moderating reviews

Go to `/admin` in a browser and log in with `ADMIN_USERNAME`/`ADMIN_PASSWORD`
from your `.env`. Open **Reviews**, click one, change its **status** to
`approved` or `rejected`, save. This replaces what the Supabase dashboard's
Table Editor used to do.

## Running the tests

```
pytest
```

Runs entirely against an in-memory SQLite database created fresh for each
test (see `tests/conftest.py`) — it never touches your real `.env` database,
so it's always safe to run.

## Changing the schema

Edit `app/models.py`, then generate a migration for the change:
```
alembic revision --autogenerate -m "describe the change"
alembic upgrade head
```
Always read the generated migration file before applying it — autogenerate
is a good first draft, not something to trust blindly.

## Deploying

See `render.yaml` — Render's dashboard can read this file directly
(**New → Blueprint**, point it at this repo). You'll be prompted once for
`DATABASE_URL` (your Neon connection string), `JWT_SECRET`, `ADMIN_PASSWORD`
and `SESSION_SECRET` — the same values from your local `.env`, pasted into
Render's dashboard instead of a file. `CORS_ORIGINS` is already set to this
project's real GitHub Pages URL in `render.yaml`.
