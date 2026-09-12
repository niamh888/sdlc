// ============================================================
// auth.js  —  This site's own backend: token storage, session state, nav sync
// ============================================================
//
// WHAT THIS FILE DOES, IN PLAIN TERMS
// There is no Supabase project any more. backend/ (a separate FastAPI +
// SQLAlchemy project — see api-config.js and backend/README.md) now issues
// a JWT (JSON Web Token — a signed, tamper-evident string proving "this is
// user X") at signup/login. This file is the ONE place that token is
// stored (in localStorage) and attached to a request (as an
// `Authorization: Bearer <token>` header) — every other script (login.js,
// quiz.js, reviews.js, my-results.js, verify.js) calls apiFetch() below
// rather than building that header itself.
//
// This file is loaded on every page (see the <script> tags near the bottom
// of each .html file), after api-config.js (defines API_BASE_URL) but
// before nav.js, quiz.js or login.js. Loading it everywhere means the
// "Log in" / "Log out" control in the header nav always matches reality,
// on every page, without each page needing its own copy of this logic.
// ============================================================

const AUTH_TOKEN_KEY = '62304_authToken';

// ---------- TOKEN STORAGE ----------
// Wrapped in try/catch throughout — a browser can refuse localStorage
// entirely (locked-down private browsing, some corporate policies), and
// that must degrade to "you'll need to sign in again next visit", never to
// a crashed page.
function getStoredToken() {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch (e) {
    return null;
  }
}

function setStoredToken(token) {
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch (e) { /* session just won't survive a reload — the best available fallback */ }
}

function clearStoredToken() {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch (e) { /* nothing to clear if storage was never writable */ }
}

// ---------- API HELPER ----------
// Every other file's requests to the backend go through this one function,
// rather than each separately building the URL, attaching the token, and
// unpacking FastAPI's error format by hand.
async function apiFetch(path, options) {
  options = options || {};
  const headers = Object.assign({}, options.headers);
  const token = getStoredToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;
  if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';

  const response = await fetch(API_BASE_URL + path, Object.assign({}, options, { headers: headers }));

  if (!response.ok) {
    // FastAPI's own error shape is `{"detail": "..."}` (a plain string for
    // most errors this site triggers on purpose, though Pydantic
    // validation failures return a more structured detail — the
    // JSON.stringify fallback below keeps that readable rather than
    // printing "[object Object]").
    let message = response.statusText;
    try {
      const body = await response.json();
      if (body && body.detail) message = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);
    } catch (e) { /* an error response with no JSON body — statusText is all there is */ }
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) return null; // no body to parse (nothing currently returns this, but safe to handle)
  return response.json();
}

// ---------- SESSION HELPERS ----------
// Same names and same rough shapes the old Supabase-backed version had —
// deliberately, so every call site elsewhere (login.js, quiz.js, ...)
// needed the smallest possible change. `{ user: {...} }` is a thinner
// stand-in for what Supabase called a "session", kept only because so much
// other code already writes `session.user.email` / `session.user.id`.

async function getCurrentSession() {
  const token = getStoredToken();
  if (!token) return null;
  try {
    const user = await apiFetch('/auth/me');
    return { user: user };
  } catch (error) {
    // An expired or otherwise invalid token reads as "not signed in", the
    // same as never having one — and clearing it here means the next
    // check does not repeat the same failed request.
    clearStoredToken();
    return null;
  }
}

async function signUpWithPassword(email, password, fullName) {
  const data = await apiFetch('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email: email, password: password, full_name: fullName })
  });
  setStoredToken(data.access_token);
  notifyAuthChanged();
  // No "email confirmation pending" branch any more — this backend never
  // requires it (see backend/app/routers/auth.py's own comment on why), so
  // a session is always returned. login.js's signup handler used to check
  // for that case; see its own updated comment for what replaced it.
  return { session: { user: data.user } };
}

async function signInWithPassword(email, password) {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: email, password: password })
  });
  setStoredToken(data.access_token);
  notifyAuthChanged();
  return { session: { user: data.user } };
}

async function signOutCurrentUser() {
  // Nothing to tell the server — a JWT is not a session row the backend
  // holds; it just stops being sent anywhere once removed from storage.
  clearStoredToken();
  notifyAuthChanged();
}

// ---------- NAV SYNC ----------
// Every page's nav has a #nav-login-link ("Log in", points at login.html)
// and a #nav-logout-btn ("Log out", hidden by default — see the .hidden
// class already used across the site for exactly this kind of toggle).
// This shows exactly one of the two, matching whatever the session actually
// is, so the header never has to be told separately by each page.
function updateAuthNav(session) {
  const loginLink = document.getElementById('nav-login-link');
  const logoutBtn = document.getElementById('nav-logout-btn');
  // Optional, unlike the two above: #nav-my-results-link exists on every
  // page (see my-results.html), but is looked up defensively (no early
  // return if missing) so a page that somehow lacks it still gets a working
  // Log in/Log out toggle rather than the whole function bailing out.
  const myResultsLink = document.getElementById('nav-my-results-link');
  if (!loginLink || !logoutBtn) return; // defensive — every page should have both

  if (session) {
    loginLink.classList.add('hidden');
    logoutBtn.classList.remove('hidden');
    // The signed-in email is shown as a tooltip rather than in the button's
    // own text, so the nav bar stays the same width whether signed in or not.
    logoutBtn.title = 'Signed in as ' + session.user.email;
    // "My Results" only means anything once signed in — a signed-out
    // visitor has no attempts of their own to show.
    if (myResultsLink) myResultsLink.classList.remove('hidden');
  } else {
    loginLink.classList.remove('hidden');
    logoutBtn.classList.add('hidden');
    logoutBtn.removeAttribute('title');
    if (myResultsLink) myResultsLink.classList.add('hidden');
  }
}

// ---------- CHANGE NOTIFICATIONS (SAME TAB + OTHER TABS) ----------
// Supabase's client had a built-in onAuthStateChange() that fired both in
// the tab that just signed in/out AND, via a storage event under the
// hood, in every OTHER open tab too. This backend has no equivalent
// service sitting behind it, so this file provides the same two halves by
// hand: notifyAuthChanged() covers THIS tab (called right after
// sign-in/up/out above), and the browser's own native 'storage' event
// covers every OTHER tab for free — it fires automatically whenever
// localStorage changes from a different tab, which is exactly what
// setStoredToken()/clearStoredToken() do.
const authChangeListeners = [];

function onAuthStateChange(callback) {
  authChangeListeners.push(callback);
}

function notifyAuthChanged() {
  getCurrentSession().then(function (session) {
    authChangeListeners.forEach(function (callback) {
      callback(session ? 'SIGNED_IN' : 'SIGNED_OUT', session);
    });
  });
}

window.addEventListener('storage', function (event) {
  if (event.key === AUTH_TOKEN_KEY) notifyAuthChanged();
});

document.addEventListener('DOMContentLoaded', function () {
  // Set the nav to match whatever session already exists — the token
  // persists in localStorage itself, so this is what makes someone still
  // look logged in after they refresh the page or come back tomorrow,
  // without this file having to manage that storage itself beyond reading it.
  getCurrentSession()
    .then(updateAuthNav)
    .catch(function (error) {
      console.error('Could not check the current sign-in status:', error);
    });

  // Keep the nav in sync from here on — covers signing in or out on THIS
  // page (login.js and the Log out button below don't need to touch the
  // nav themselves) and, via the 'storage' listener above, in another tab.
  onAuthStateChange(function (event, session) {
    updateAuthNav(session);
  });

  const logoutBtn = document.getElementById('nav-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      signOutCurrentUser().catch(function (error) {
        console.error('Sign out failed:', error);
      });
      // No explicit redirect here: notifyAuthChanged() fires immediately
      // and swaps the nav back to "Log in" wherever the user happens to be.
    });
  }
});
