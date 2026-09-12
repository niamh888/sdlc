# ============================================================
# database.py — the SQLAlchemy engine, session factory, and the get_db()
# dependency every route uses to talk to Postgres
# ============================================================
#
# WHAT THIS FILE DOES, IN PLAIN TERMS
# Supabase used to hand every browser request a ready-made database
# connection invisibly, behind its own REST API. Now that this project owns
# its own backend, THIS file is where that connection actually gets made.
# Everything else in app/ imports `Base` (to define a table as a Python
# class — see models.py) or `get_db` (to actually read/write rows) from
# here; nothing else needs to know a connection string, a driver, or even
# which database engine is in use.
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from .config import settings

# Neon (and most Postgres hosts) hand out a connection string that starts
# with the generic `postgresql://` scheme. SQLAlchemy treats that as "use
# whatever the default Postgres driver is", which for historical reasons is
# still psycopg2 — NOT the psycopg (v3) driver this project actually
# installs (see requirements.txt's comment on why). Rewriting the scheme
# here to `postgresql+psycopg://` tells SQLAlchemy explicitly which driver
# to use, so DATABASE_URL in .env can stay exactly what Neon's dashboard
# gives you, unedited, copy-pasted as-is.
database_url = settings.database_url
if database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)

# pool_pre_ping=True: before handing out a pooled connection, SQLAlchemy
# pings it and silently reconnects if it went stale. Matters especially on
# a free-tier database (like Neon, which scales to zero when idle) — without
# this, the FIRST request after a quiet spell would fail with a "connection
# closed" error instead of just transparently reconnecting.
engine = create_engine(database_url, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Every model in models.py inherits from this. It is what lets
    Base.metadata (used by Alembic's migrations) discover every table in
    the app by simply importing models.py once — no table has to be
    registered anywhere by hand."""
    pass


def get_db():
    """FastAPI dependency: yields ONE Session per request, always closed
    afterwards — even if the request raised an exception. Any route needing
    the database declares `db: Session = Depends(get_db)` and FastAPI wires
    this generator in and out around the request automatically; the route
    itself never has to remember to close anything."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
