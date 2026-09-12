// ============================================================
// api-config.js — where this site's own backend actually lives
// ============================================================
// Replaces supabase-config.js. There is no Supabase project involved any
// more — backend/ (a separate FastAPI + SQLAlchemy project, see its own
// README) is this site's real backend now, and this one constant is the
// only thing every other script needs to know about it.
//
// Local development: run the backend (see backend/README.md — in short,
// `uvicorn app.main:app --reload --port 8001` from inside backend/, after
// its own one-time setup) then serve this site itself the usual way
// (`python -m http.server 8000`). Two different ports on purpose — this
// site's own static files and the API are two separate processes.
//
// Production: this gets updated to the real deployed backend's URL once
// it's hosted on Render — see backend/render.yaml.
const API_BASE_URL = 'http://127.0.0.1:8001';
