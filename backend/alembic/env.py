# ============================================================
# alembic/env.py — tells Alembic how to find the database and the models
# ============================================================
# This is boilerplate Alembic itself generates — the only two lines worth
# reading are the sys.path insert (so `app` is importable when Alembic is
# run from backend/, same as uvicorn is) and setting sqlalchemy.url from
# THIS project's own settings.py rather than duplicating a connection
# string inside alembic.ini.
import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import engine_from_config, pool

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import settings  # noqa: E402
from app.database import Base  # noqa: E402
from app import models  # noqa: E402,F401 — importing this registers every table on Base.metadata below

config = context.config

# Same scheme rewrite as app/database.py — see its comment for why. Alembic
# builds its OWN engine independently of that file, so this has to be
# repeated here rather than reused.
_database_url = settings.database_url
if _database_url.startswith("postgresql://"):
    _database_url = _database_url.replace("postgresql://", "postgresql+psycopg://", 1)
config.set_main_option("sqlalchemy.url", _database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True, dialect_opts={"paramstyle": "named"})
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
