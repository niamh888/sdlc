// ============================================================
// THEME TOGGLE — light / dark
//
// WHAT THIS FILE DOES
// Swaps a single attribute on <html>: data-theme="dark" or data-theme="light".
// All the actual colour work happens in style.css, which defines every colour
// twice — once under :root and once under [data-theme="dark"]. Nothing here
// touches a colour, which is the point: if the theme logic and the palette were
// tangled together, adding a colour would mean editing JavaScript.
//
// THE THREE-WAY DEFAULT
// A theme switch has three possible states, not two:
//
//   1. The visitor has chosen one   -> honour their choice
//   2. They have not chosen         -> follow the operating system
//   3. They chose, then the OS changed later -> STILL honour their choice
//
// Most naive implementations get (3) wrong by re-reading the system setting on
// every load. A saved preference is a deliberate act and outranks the system.
//
// WHY THERE IS ALSO A SCRIPT IN THE <head>
// This file is loaded with `defer`, so it runs after the HTML is parsed — which
// is far too late. The browser would paint the light theme first and then repaint
// dark, giving a white flash on every page load. That flash is genuinely
// unpleasant in a dark room, and it is the reason every site with a dark mode has
// a small blocking script in its <head>. That snippet sets the attribute before
// the first paint; this file handles the button afterwards. The duplication is
// deliberate and unavoidable without a server.
// ============================================================

// One key, one meaning. Prefixed like the others so it is obvious in DevTools
// which site owns it. See the privacy notice, which lists every key.
const THEME_KEY = '62304_theme';

// Returns 'dark' or 'light' — the theme currently applied to the document.
function currentTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark'
    ? 'dark'
    : 'light';
}

// Applies a theme and updates the button to describe what it will do NEXT.
//
// The label wording matters more than it looks. A button that says "Dark theme"
// is ambiguous — is that the current state or the thing it switches to? So the
// accessible name states the ACTION ("Switch to dark theme") and aria-pressed
// carries the STATE. Together they are unambiguous in either order.
function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

  const btn = document.getElementById('theme-toggle');
  if (!btn) return;

  btn.setAttribute('aria-pressed', String(isDark));
  btn.querySelector('.theme-toggle-label').textContent =
    isDark ? 'Switch to light theme' : 'Switch to dark theme';
  // Show the destination, not the current state: the moon means "go dark".
  btn.querySelector('.theme-toggle-icon').textContent = isDark ? '☀' : '☽';
}

// ---------- WIRING ----------

document.addEventListener('DOMContentLoaded', function () {
  const btn = document.getElementById('theme-toggle');

  // The head snippet has already set the attribute, so this call is about
  // bringing the BUTTON into line with the theme already on screen rather than
  // about changing the theme. Without it the button would start out labelled for
  // the wrong direction whenever dark mode was restored from storage.
  applyTheme(currentTheme());

  if (btn) {
    btn.addEventListener('click', function () {
      const next = currentTheme() === 'dark' ? 'light' : 'dark';
      applyTheme(next);

      // Persisting here — and only here — is what makes the choice outrank the
      // system setting on later visits. Storage can throw in private browsing
              // modes with storage disabled, and a failure to remember a colour scheme
      // should never break the page, so it is caught and ignored.
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch (e) {
        /* preference simply will not persist; the toggle still works */
      }
    });
  }

  // Follow the system if — and only if — the visitor has never chosen. Someone
  // who has picked light explicitly should not be flipped to dark at sunset
  // because their OS switched.
  if (window.matchMedia) {
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemChange = function (e) {
      let saved = null;
      try {
        saved = localStorage.getItem(THEME_KEY);
      } catch (err) { /* treat as no preference */ }
      if (!saved) applyTheme(e.matches ? 'dark' : 'light');
    };

    // addEventListener on a MediaQueryList is the modern form; older Safari only
    // has addListener. Feature-detected rather than assumed, because the failure
    // mode is a thrown TypeError that would stop the rest of this file running.
    if (systemDark.addEventListener) {
      systemDark.addEventListener('change', onSystemChange);
    } else if (systemDark.addListener) {
      systemDark.addListener(onSystemChange);
    }
  }
});
