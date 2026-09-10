// ============================================================
// auth.js  —  Supabase authentication: client setup, session state, nav sync
// ============================================================
//
// WHAT THIS FILE DOES, IN PLAIN TERMS
// Supabase Auth is a separate mini-service bundled with the same Supabase
// project as the database (see supabase/schema.sql). It keeps track of who
// is signed in and hands out a JWT (JSON Web Token) — a signed proof of
// identity — which the Supabase client attaches to every database request
// automatically. The Row Level Security policies in schema.sql check that
// token (via auth.uid()) to decide what each request may see or change.
// With nobody signed in there is no token, and the "signed in only"
// policies simply refuse the request — which is what makes login a REAL
// gate, not just something the page's own JavaScript chooses to enforce.
//
// This file is loaded on every page (see the <script> tags near the bottom
// of each .html file), after supabase-config.js and assets/js/supabase.min.js
// but before nav.js, quiz.js or login.js. Loading it everywhere means:
//   1. One Supabase client exists per page load, created once here and
//      reused by every other script — quiz.js and login.js both call the
//      functions below rather than each creating their own client.
//   2. The "Log in" / "Log out" control in the header nav always matches
//      reality, on every page, without each page needing its own copy of
//      this logic.
// ============================================================

// ---------- CLIENT ----------
// `supabase` (lowercase) is the global created by assets/js/supabase.min.js.
// SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY come from supabase-config.js. Both
// must be loaded, in that order, before this file — see the <script> tags
// at the bottom of every page.
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// ---------- SESSION HELPERS ----------
// Thin wrappers around the Supabase calls used elsewhere (login.js, quiz.js)
// so those files do not need to know the exact shape of Supabase's
// responses, and so an error is always a real thrown Error rather than a
// silently-ignored `{ error }` field on the result.

async function getCurrentSession() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) throw error;
  return data.session; // null when nobody is signed in
}

async function signUpWithPassword(email, password, fullName) {
  const { data, error } = await supabaseClient.auth.signUp({
    email: email,
    password: password,
    // `options.data` becomes the new user's raw_user_meta_data — arbitrary
    // profile fields Supabase Auth will happily store alongside the account
    // but never itself uses. Storing the name here means quiz.js can read
    // it straight off the session (session.user.user_metadata.full_name)
    // with no extra "profiles" table or database round trip.
    options: { data: { full_name: fullName } }
  });
  if (error) throw error;
  // data.session is null when the Supabase project requires email
  // confirmation before a new account can sign in — login.js checks for
  // that and shows the right message instead of assuming success.
  return data;
}

async function signInWithPassword(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email: email, password: password });
  if (error) throw error;
  return data;
}

async function signOutCurrentUser() {
  const { error } = await supabaseClient.auth.signOut();
  if (error) throw error;
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

document.addEventListener('DOMContentLoaded', function () {
  // Set the nav to match whatever session already exists — Supabase persists
  // a signed-in session in localStorage itself, so this is what makes
  // someone still look logged in after they refresh the page or come back
  // tomorrow, without this file having to manage that storage itself.
  getCurrentSession()
    .then(updateAuthNav)
    .catch(function (error) {
      console.error('Could not check the current sign-in status:', error);
    });

  // Keep the nav in sync from here on. This single callback covers signing
  // in or out on THIS page (login.js and the Log out button below don't
  // need to touch the nav themselves) and also signing in or out in another
  // browser tab, which Supabase reports through this same callback.
  supabaseClient.auth.onAuthStateChange(function (event, session) {
    updateAuthNav(session);
  });

  const logoutBtn = document.getElementById('nav-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      signOutCurrentUser().catch(function (error) {
        console.error('Sign out failed:', error);
      });
      // No explicit redirect here: onAuthStateChange fires immediately and
      // swaps the nav back to "Log in" wherever the user happens to be.
    });
  }
});
