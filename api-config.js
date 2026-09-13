// ============================================================
// api-config.js — where this site's own backend actually lives
// ============================================================
// Replaces supabase-config.js. There is no Supabase project involved any
// more — backend/ (a separate FastAPI + SQLAlchemy project, see its own
// README) is this site's real backend now, and this one constant is the
// only thing every other script needs to know about it.
//
// AUTO-DETECTED rather than a single hardcoded value, so the exact same
// file works whether this page is being served locally or from the real
// GitHub Pages site, with nobody having to remember to toggle it by hand
// before testing or after deploying:
//   - Opened via localhost or 127.0.0.1 (running `python -m http.server
//     8000` yourself — see backend/README.md for the matching local
//     backend setup) -> talks to the backend running on YOUR machine.
//   - Opened from anywhere else (the real niamh888.github.io site) ->
//     talks to the real deployed backend on Render (see backend/render.yaml).
const API_BASE_URL = (function () {
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  return isLocal ? 'http://127.0.0.1:8001' : 'https://sdlc-training-api.onrender.com';
})();
