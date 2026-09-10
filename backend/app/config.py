# ============================================================
# config.py — every setting this app reads from its environment, in one place
# ============================================================
#
# WHY THIS EXISTS AS ITS OWN FILE
# Nothing below is a secret this file HOLDS — DATABASE_URL, JWT_SECRET and
# CORS_ORIGINS all come FROM the environment: a local .env file in
# development (see .env.example — copy it to .env and fill it in, .env
# itself is gitignored, same "public config vs real secret" split
# supabase-config.js already drew on the frontend), Render's dashboard
# "Environment" tab in production. Keeping the reading of them in one small
# file means no other file in app/ needs to know HOW a setting arrives, only
# that `settings.whatever` already exists and is already the right type.
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # No default on purpose — a missing DATABASE_URL should fail loudly at
    # startup, not silently fall back to something that quietly loses data.
    database_url: str

    # Signs every JWT this app issues (see security.py). Anyone who has this
    # value can forge a valid "I am any user" token, so it must never be
    # committed — .env.example ships an obviously-fake placeholder, and the
    # real value is generated once per environment (see README in this
    # folder for the command) and only ever lives in .env / Render's
    # dashboard.
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    # A week — long enough that "signing in" actually feels like signing in
    # rather than re-authenticating constantly, short enough that a stolen
    # token doesn't work forever.
    jwt_expires_minutes: int = 60 * 24 * 7

    # Comma-separated list of frontend origins allowed to call this API —
    # see main.py's CORSMiddleware. Defaults to the local dev server this
    # project's README already tells you to run (python -m http.server 8000).
    cors_origins: str = "http://localhost:8000"

    # The ONE admin login for the /admin review-moderation panel (see
    # admin.py) — replaces Supabase's Table Editor, which only Niamh's own
    # Supabase account could reach. There is deliberately no admin sign-up
    # anywhere; this single username/password pair, set only in .env /
    # Render's dashboard, is the entire admin account system.
    admin_username: str = "admin"
    admin_password: str

    # Signs the admin panel's session cookie (Starlette's SessionMiddleware,
    # via itsdangerous) — a SEPARATE secret from jwt_secret above. Sharing
    # one secret between two different signing purposes is avoidable risk
    # for no real benefit, so this project doesn't.
    session_secret: str

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
