// ============================================================
// login.js  —  Log in / Sign up forms
// ============================================================
//
// Relies on auth.js having already created `supabaseClient` and defined
// signInWithPassword() / signUpWithPassword() — see the <script> order at
// the bottom of login.html. Structurally this mirrors contact.js: blur
// validation, a disabled/aria-busy button while the request is in flight,
// and the same three async states (loading / success / failure).
// ============================================================

// ---------- VALIDATORS ----------
function validateNameField(value) {
  if (!value) return 'Please enter your name.';
  if (value.length < 2) return 'Name must be at least 2 characters.';
  return '';
}

function validateEmailField(value) {
  if (!value) return 'Please enter your email address.';
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(value)) return 'Please enter a valid email address.';
  return '';
}

function validatePasswordField(value) {
  if (!value) return 'Please enter a password.';
  // Matches Supabase's own minimum, so this fails instantly rather than
  // after a round trip to the server for something checkable locally.
  if (value.length < 6) return 'Password must be at least 6 characters.';
  return '';
}

// ---------- SHOW / CLEAR FIELD ERROR ----------
// Same helper as contact.js — kept as a separate copy rather than shared
// because these two pages are not currently loaded together, and a shared
// tiny DOM helper is not worth adding a third <script> tag everywhere for.
function showFieldError(fieldId, errorId, message) {
  const field = document.getElementById(fieldId);
  const errorEl = document.getElementById(errorId);

  if (message) {
    field.classList.add('error');
    errorEl.textContent = message;
  } else {
    field.classList.remove('error');
    errorEl.textContent = '';
  }

  return !message; // true = valid, false = invalid
}

// ---------- REDIRECT TARGET ----------
// login.html?redirect=quiz.html sends the user back to whatever page sent
// them here (see quiz.js's auth gate). Falls back to the home page.
// Only a bare "name.html" is ever accepted — never a full URL — so this
// cannot be turned into an open redirect via a crafted link.
function getRedirectTarget() {
  const requested = new URLSearchParams(window.location.search).get('redirect');
  if (requested && /^[a-z0-9_-]+\.html$/i.test(requested)) return requested;
  return 'index.html';
}

// ---------- ERROR MESSAGES ----------
// Supabase's own error messages are written for developers reading logs
// ("Invalid login credentials", "User already registered"). Both are close
// enough to plain English to leave mostly as-is, but rephrased slightly so
// they read as sentences aimed at the person filling in the form.
function friendlyAuthError(error) {
  const msg = error && error.message ? error.message : 'Something went wrong. Please try again.';
  if (/invalid login credentials/i.test(msg)) {
    return 'Incorrect email or password.';
  }
  if (/user already registered/i.test(msg)) {
    return 'An account with this email already exists — try logging in instead.';
  }
  return msg;
}

// ---------- INIT ----------
document.addEventListener('DOMContentLoaded', function () {

  // ---------- TAB SWITCHING ----------
  const tabLogin = document.getElementById('tab-login');
  const tabSignup = document.getElementById('tab-signup');
  const loginPanel = document.getElementById('login-panel');
  const signupPanel = document.getElementById('signup-panel');

  function showTab(mode) {
    const isLogin = mode === 'login';
    tabLogin.classList.toggle('active', isLogin);
    tabSignup.classList.toggle('active', !isLogin);
    tabLogin.setAttribute('aria-selected', String(isLogin));
    tabSignup.setAttribute('aria-selected', String(!isLogin));
    loginPanel.classList.toggle('hidden', !isLogin);
    signupPanel.classList.toggle('hidden', isLogin);
  }

  tabLogin.addEventListener('click', function () { showTab('login'); });
  tabSignup.addEventListener('click', function () { showTab('signup'); });

  // Arriving from the quiz's "please sign in" gate — show the banner and
  // default straight to the Sign Up tab, since a first-time visitor is more
  // likely than an existing user to be the one following that link.
  if (new URLSearchParams(window.location.search).get('redirect') === 'quiz.html') {
    const notice = document.getElementById('login-redirect-notice');
    if (notice) notice.classList.remove('hidden');
  }

  // ---------- LOG IN ----------
  const loginForm = document.getElementById('login-form');
  const loginSubmit = document.getElementById('login-submit');
  const loginError = document.getElementById('login-error');
  const loginErrorMessage = document.getElementById('login-error-message');

  document.getElementById('login-email').addEventListener('blur', function () {
    showFieldError('login-email', 'login-email-error', validateEmailField(this.value.trim()));
  });
  document.getElementById('login-password').addEventListener('blur', function () {
    showFieldError('login-password', 'login-password-error', this.value ? '' : 'Please enter your password.');
  });

  loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    const emailValid = showFieldError('login-email', 'login-email-error', validateEmailField(email));
    const passwordValid = showFieldError('login-password', 'login-password-error', password ? '' : 'Please enter your password.');
    if (!emailValid || !passwordValid) return;

    loginSubmit.disabled = true;
    loginSubmit.setAttribute('aria-busy', 'true');
    loginSubmit.textContent = 'Logging in…';
    loginError.classList.add('hidden');

    try {
      await signInWithPassword(email, password);
      // Success navigates away immediately, so there is no button state to
      // restore — the page the user lands on is a fresh load either way.
      window.location.href = getRedirectTarget();

    } catch (error) {
      loginErrorMessage.textContent = friendlyAuthError(error);
      loginError.classList.remove('hidden');
      loginSubmit.disabled = false;
      loginSubmit.removeAttribute('aria-busy');
      loginSubmit.textContent = 'Log In';
    }
  });

  // ---------- SIGN UP ----------
  const signupForm = document.getElementById('signup-form');
  const signupSubmit = document.getElementById('signup-submit');
  const signupError = document.getElementById('signup-error');
  const signupErrorMessage = document.getElementById('signup-error-message');
  const authSuccess = document.getElementById('auth-success');
  const authSuccessMessage = document.getElementById('auth-success-message');

  document.getElementById('signup-name').addEventListener('blur', function () {
    showFieldError('signup-name', 'signup-name-error', validateNameField(this.value.trim()));
  });
  document.getElementById('signup-email').addEventListener('blur', function () {
    showFieldError('signup-email', 'signup-email-error', validateEmailField(this.value.trim()));
  });
  document.getElementById('signup-password').addEventListener('blur', function () {
    showFieldError('signup-password', 'signup-password-error', validatePasswordField(this.value));
  });
  document.getElementById('signup-password-confirm').addEventListener('blur', function () {
    const pw = document.getElementById('signup-password').value;
    showFieldError('signup-password-confirm', 'signup-password-confirm-error',
      this.value !== pw ? 'Passwords do not match.' : '');
  });

  signupForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirm = document.getElementById('signup-password-confirm').value;

    const nameValid = showFieldError('signup-name', 'signup-name-error', validateNameField(name));
    const emailValid = showFieldError('signup-email', 'signup-email-error', validateEmailField(email));
    const passwordValid = showFieldError('signup-password', 'signup-password-error', validatePasswordField(password));
    const confirmValid = showFieldError('signup-password-confirm', 'signup-password-confirm-error',
      confirm !== password ? 'Passwords do not match.' : '');
    if (!nameValid || !emailValid || !passwordValid || !confirmValid) return;

    signupSubmit.disabled = true;
    signupSubmit.setAttribute('aria-busy', 'true');
    signupSubmit.textContent = 'Creating account…';
    signupError.classList.add('hidden');

    try {
      const result = await signUpWithPassword(email, password, name);

      if (result.session) {
        // Email confirmation is OFF for this project — Supabase signed the
        // new account in immediately, so send them straight on their way.
        window.location.href = getRedirectTarget();
        return;
      }

      // Email confirmation is ON — Supabase created the account but will not
      // issue a session until the confirmation link is clicked. Say so
      // honestly instead of pretending signup finished the job; a fake
      // "Account created!" here would just leave the next login attempt
      // failing for a reason the user was never told about.
      signupForm.classList.add('hidden');
      authSuccessMessage.textContent =
        'We’ve sent a confirmation link to ' + email + '. Click it, then come back here and log in.';
      authSuccess.classList.remove('hidden');

    } catch (error) {
      signupErrorMessage.textContent = friendlyAuthError(error);
      signupError.classList.remove('hidden');
      signupSubmit.disabled = false;
      signupSubmit.removeAttribute('aria-busy');
      signupSubmit.textContent = 'Create Account';
    }
  });
});
