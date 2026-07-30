// ============================================================
// contact.js  —  Contact page: real-time validation, async form submission
// ============================================================
//
// WHY THIS PAGE NEEDS ASYNC
// The original version of this form validated the fields and then revealed
// the "Message Sent!" panel on the very next line. That was instant, which
// was the giveaway that nothing was actually being sent anywhere.
//
// Sending a message over a network is the textbook case for asynchronous
// code, because it is the textbook case for WAITING. A request might take
// 50ms on office broadband or 8 seconds on a hospital wifi connection, and
// it might not arrive at all. Three things follow from that, and all three
// are implemented below:
//
//   1. The interface must say something is happening   → "Sending…" state
//   2. It must cope with failure                       → try / catch
//   3. It must always return to a usable state         → finally
//
// It also has to prevent the user pressing Send five times while the first
// attempt is still in flight, which is why the button is disabled during
// the request.
// ============================================================

// ---------- CONFIG ----------
// Where to POST the form. This is a live Formspree endpoint, so submissions
// from this page are genuinely delivered by email.
//
// It is safe for this URL to sit in public client-side code — that is how
// Formspree is designed to work, and the same URL is visible to anyone who
// views source on the deployed site. It is a write-only drop box: it accepts
// submissions but cannot be used to read anything back.
//
// Setting this to an empty string switches the form into DEMO MODE, which runs
// the whole async code path without transmitting anything. That is useful for
// local development when you do not want to spend real submissions from the
// monthly quota.
const CONTACT_ENDPOINT = 'https://formspree.io/f/mpqgydrv';

// How long to wait before giving up on the server, in milliseconds.
// Without a timeout, a request to a server that accepts the connection but
// never replies would leave the button stuck on "Sending…" indefinitely.
// Browsers do eventually time out, but only after a minute or more.
const REQUEST_TIMEOUT_MS = 10000;

// Demo-mode settings — inactive while CONTACT_ENDPOINT is set above. Kept
// because blanking the endpoint is the easiest way to work on the form locally
// without sending real messages.
const DEMO_DELAY_MS = 900;   // pretend network round-trip, so the "Sending…" state is visible

// Set this to a number between 0 and 1 to make demo submissions fail at
// random, which is a convenient way to see the error-handling path in
// action. 0.5 means roughly half of all attempts fail. Leave at 0 normally.
const DEMO_FAILURE_RATE = 0;

// ---------- VALIDATORS ----------
// Each validator is a pure function: takes a string, returns an error message
// or an empty string if the value is valid. Keeping logic here (separate from
// DOM interaction) means you can test or reuse these without touching the page.
//
// Note that all of these are SYNCHRONOUS. Validation is instant local
// computation with no waiting involved, so making it async would add
// complexity for nothing. Reach for async only when there is a genuine wait.

function validateName(value) {
  if (!value) return 'Please enter your name.';
  if (value.length < 2) return 'Name must be at least 2 characters.';
  return '';
}

function validateEmail(value) {
  if (!value) return 'Please enter your email address.';
  // A regular expression pattern. ^ and $ anchor to start/end of string.
  // [^\s@]+ means "one or more characters that are not whitespace or @".
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(value)) return 'Please enter a valid email address.';
  return '';
}

function validateMessage(value) {
  if (!value) return 'Please enter a message.';
  if (value.length < 10) return 'Message must be at least 10 characters.';
  return '';
}

// ---------- SHOW / CLEAR FIELD ERROR ----------
// Adds the red border and error text for one field, or clears it.
// Returns true if valid (no error), false if invalid — used by the submit handler.
function showFieldError(fieldId, errorId, message) {
  const field = document.getElementById(fieldId);
  const errorEl = document.getElementById(errorId);

  if (message) {
    field.classList.add('error');       // red border via CSS
    errorEl.textContent = message;
  } else {
    field.classList.remove('error');
    errorEl.textContent = '';
  }

  return !message; // true = valid, false = invalid
}

// Combines getting the value, running the validator, and showing the result.
function validateField(fieldId, errorId, validatorFn) {
  const field = document.getElementById(fieldId);
  const message = validatorFn(field.value.trim()); // trim() removes leading/trailing spaces
  return showFieldError(fieldId, errorId, message);
}

// ---------- SEND: DEMO MODE ----------
// Stands in for a network request when no endpoint is configured. The only
// honest thing to do here is wait and then succeed — but note that it waits
// using `await delay()` rather than blocking, so the page stays responsive
// throughout, exactly as a real request would.
async function sendMessageDemo() {
  await delay(DEMO_DELAY_MS);

  // Optional simulated failure, so the catch block can be seen working.
  if (Math.random() < DEMO_FAILURE_RATE) {
    throw new Error('Simulated network failure (DEMO_FAILURE_RATE is above 0 in contact.js).');
  }
}

// ---------- INTERPRETING A REJECTED SUBMISSION ----------
// Turns a failed HTTP response into a useful Error object.
//
// A bare status code is close to useless to the person filling in the form —
// "HTTP 422" tells them nothing about what to change. Form back-ends send a
// JSON body explaining the problem, so it is worth reading it.
//
// Formspree's shape for a rejected submission is:
//
//     { "errors": [ { "field": "email", "message": "is not a valid email",
//                     "code": "TYPE_EMAIL" } ] }
//
// Some failures instead return a single { "error": "..." } string, and some
// (a gateway timeout, say) return no JSON at all — so every step below has to
// cope with the body not being what we hoped.
//
// The returned Error carries an extra `fieldErrors` property when the server
// blamed specific fields. Attaching data to an Error like this is a neat way to
// pass structured detail up to the catch block, which uses it to put messages
// beside the offending inputs rather than lumping them into one banner.
async function buildSubmissionError(response) {
  let body = null;

  // response.json() throws if the body is empty or is HTML rather than JSON,
  // which is exactly what a proxy or gateway error page would give us. There is
  // nothing to do about that beyond falling back to the status code, so the
  // failure is swallowed deliberately here.
  try {
    body = await response.json();
  } catch (notJson) {
    body = null;
  }

  // Field-level validation errors — the most useful case.
  if (body && Array.isArray(body.errors) && body.errors.length > 0) {
    const fieldErrors = body.errors
      .filter(function (e) { return e && e.field; })
      .map(function (e) { return { field: e.field, message: e.message || 'is not valid' }; });

    // Build a readable summary for the banner, e.g. "email is not a valid email".
    const summary = body.errors
      .map(function (e) { return (e.field ? e.field + ' ' : '') + (e.message || 'is not valid'); })
      .join('; ');

    const error = new Error('The server rejected the message: ' + summary);
    if (fieldErrors.length > 0) error.fieldErrors = fieldErrors;
    return error;
  }

  // A single error string.
  if (body && typeof body.error === 'string') {
    return new Error('The server rejected the message: ' + body.error);
  }

  // No usable body — fall back to translating the status code. These three are
  // the ones worth naming, because each implies a different fix.
  if (response.status === 429) {
    return new Error('Too many messages have been sent recently. Please wait a few minutes and try again.');
  }
  if (response.status === 403 || response.status === 404) {
    return new Error('The contact form is not configured correctly (HTTP ' + response.status + '). Please report this.');
  }
  if (response.status >= 500) {
    return new Error('The message service is temporarily unavailable (HTTP ' + response.status + '). Please try again shortly.');
  }

  return new Error('The server could not accept your message (HTTP ' + response.status + ').');
}

// ---------- SEND: REAL NETWORK REQUEST ----------
// POSTs the form to CONTACT_ENDPOINT. This runs only when an endpoint has
// been configured above.
//
// The interesting part here is CANCELLATION. A Promise has no built-in
// "stop" — once started you cannot un-start it. Fetch solves this with an
// AbortController: a small object with a `signal` you hand to fetch, and an
// `abort()` method that makes that fetch reject immediately. Combining it
// with setTimeout gives a request timeout, which fetch does not provide
// on its own.
async function sendMessageReal(formData) {
  const controller = new AbortController();

  // Schedule the cancellation. If the fetch finishes first, we clear this
  // timer in the finally block so it never fires.
  const timeoutId = setTimeout(function () {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(CONTACT_ENDPOINT, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: formData,          // FormData sets its own content type automatically
      signal: controller.signal // the link that lets controller.abort() cancel this
    });

    // The same trap described in async-utils.js applies here: fetch does not
    // throw on a 4xx or 5xx response. A rejected submission is still a
    // successful round trip as far as fetch is concerned, so the status has
    // to be checked explicitly or a failed send would look like a success.
    if (!response.ok) {
      throw await buildSubmissionError(response);
    }

  } catch (error) {
    // An aborted fetch rejects with an error whose name is 'AbortError'.
    // Translating it into plain language here means the user gets a useful
    // message instead of a developer-facing one.
    if (error.name === 'AbortError') {
      throw new Error('The request timed out after ' + (REQUEST_TIMEOUT_MS / 1000) + ' seconds. Please check your connection and try again.');
    }
    // A genuine network failure (offline, DNS, blocked) arrives as a TypeError
    // with an unhelpful message like "Failed to fetch", so replace it too.
    if (error instanceof TypeError) {
      throw new Error('Could not reach the server. Please check your internet connection and try again.');
    }
    throw error; // anything else (including our own !response.ok error) passes through unchanged

  } finally {
    // Always cancel the pending timer. Without this, a request that completed
    // in 200ms would still leave a timer scheduled for 10 seconds later. It
    // would not break anything here, but leaked timers are a common source of
    // baffling bugs in bigger applications.
    clearTimeout(timeoutId);
  }
}

// ---------- INIT ----------
document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('contact-form');
  const submitBtn = document.getElementById('submit-message');
  const successPanel = document.getElementById('form-success');
  const successHeading = document.getElementById('form-success-heading');
  const successMessage = document.getElementById('form-success-message');
  const errorPanel = document.getElementById('form-error');
  const errorMessage = document.getElementById('form-error-message');

  // True when no endpoint has been configured, so we are simulating.
  const isDemoMode = CONTACT_ENDPOINT === '';

  // BLUR VALIDATION — fires when the user leaves a field (clicks away).
  // Validating on blur rather than on every keystroke gives the user a chance
  // to finish typing before seeing an error.
  document.getElementById('name').addEventListener('blur', function () {
    validateField('name', 'name-error', validateName);
  });

  document.getElementById('email').addEventListener('blur', function () {
    validateField('email', 'email-error', validateEmail);
  });

  document.getElementById('message').addEventListener('blur', function () {
    validateField('message', 'message-error', validateMessage);
  });

  // ---------- SUBMIT ----------
  // The handler is declared `async` so it can `await` the send. Note that
  // e.preventDefault() is called at the very top, BEFORE the first await.
  //
  // That ordering is important and easy to get wrong. The browser decides
  // whether to go ahead with its default behaviour (submitting the form and
  // reloading the page) as soon as the handler returns control — and an
  // `await` returns control. So preventDefault() must run synchronously,
  // before any awaiting; called after an await it would arrive too late and
  // the page would reload out from under you.
  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    // Validate all required fields. Each call returns true/false.
    // All three run even if the first fails, so every error shows at once.
    const nameValid    = validateField('name',    'name-error',    validateName);
    const emailValid   = validateField('email',   'email-error',   validateEmail);
    const messageValid = validateField('message', 'message-error', validateMessage);

    // Only proceed if everything passed. Validation is synchronous, so an
    // invalid form is rejected instantly with no network activity at all.
    if (!nameValid || !emailValid || !messageValid) return;

    // Capture the field values now, before the await. FormData reads the
    // form as it stands at this moment, which is what we want to send.
    const formData = new FormData(form);

    // ---- STATE 1: SENDING ----
    // Disabling the button is not cosmetic. Without it, a user who clicks
    // twice sends the message twice, because the first request has not
    // finished and nothing else is stopping the second. Disabling the
    // control that started an async operation is the standard defence.
    submitBtn.disabled = true;
    submitBtn.setAttribute('aria-busy', 'true'); // tells screen readers it is working
    submitBtn.textContent = 'Sending…';
    errorPanel.classList.add('hidden');          // clear any previous failure

    try {
      // One await, two possible implementations. Both are async functions
      // returning Promises, so the calling code does not care which it got —
      // a small illustration of how Promises hide the difference between
      // "waiting for a network" and "waiting for anything else".
      if (isDemoMode) {
        await sendMessageDemo();
      } else {
        await sendMessageReal(formData);
      }

      // ---- STATE 2: SUCCESS ----
      // Word the confirmation to match what actually happened. In demo mode
      // no message was transmitted, so claiming "Message Sent!" would simply
      // be untrue — the exact problem this rewrite set out to fix.
      if (isDemoMode) {
        successHeading.textContent = 'Message Validated';
        successMessage.textContent =
          'Your message passed every validation check and the full submission ' +
          'sequence ran correctly. This training site has no live form endpoint ' +
          'configured, so nothing was transmitted. See CONTACT_ENDPOINT in ' +
          'contact.js to connect a real one.';
      } else {
        successHeading.textContent = 'Message Sent!';
        successMessage.textContent =
          'Thank you for your feedback. We will review your message and respond where appropriate.';
      }

      form.classList.add('hidden');
      successPanel.classList.remove('hidden');

    } catch (error) {
      // ---- STATE 3: FAILURE ----
      // The form stays on screen with the user's text intact so they can
      // simply press Send again. Wiping a carefully written message because
      // the network hiccuped is one of the most irritating things a form can
      // do, and it is entirely avoidable.
      errorMessage.textContent = error.message;
      errorPanel.classList.remove('hidden');
      console.error('Message submission failed:', error);

      // If the server blamed particular fields, show its message beside each
      // one instead of only in the banner at the bottom.
      //
      // This is SERVER-SIDE validation arriving after the fact, and it is why
      // client-side validation can never be the only line of defence: the
      // browser checks are a convenience to catch mistakes early, but the
      // server has information we do not (a blocklist, a domain that does not
      // accept mail) and gets the final say. Reusing showFieldError() here
      // means both kinds of error look identical to the user, which is what
      // you want — they do not care which side found the problem.
      if (Array.isArray(error.fieldErrors)) {
        error.fieldErrors.forEach(function (fe) {
          // Only touch fields that actually exist on this form, so an
          // unexpected field name from the server cannot throw.
          if (document.getElementById(fe.field) && document.getElementById(fe.field + '-error')) {
            showFieldError(fe.field, fe.field + '-error', fe.message);
          }
        });

        // Move focus to the first rejected field so keyboard and screen reader
        // users are taken straight to what needs fixing.
        const firstField = document.getElementById(error.fieldErrors[0].field);
        if (firstField) firstField.focus();
      }

    } finally {
      // `finally` runs on every path — success, failure, even an unexpected
      // error. Restoring the button here is the reason it can never be left
      // permanently disabled and reading "Sending…", which is exactly the bug
      // that appears when this reset is duplicated into the try and catch
      // blocks instead and one copy gets forgotten.
      submitBtn.disabled = false;
      submitBtn.removeAttribute('aria-busy');
      submitBtn.textContent = 'Send Message';
    }
  });

  // SEND ANOTHER — resets the form back to its empty state.
  document.getElementById('send-another').addEventListener('click', function () {
    form.reset(); // clears all field values

    // Clear any leftover error styles from the previous attempt.
    document.querySelectorAll('.field-error').forEach(function (el) { el.textContent = ''; });
    document.querySelectorAll('.error').forEach(function (el) { el.classList.remove('error'); });

    errorPanel.classList.add('hidden');
    successPanel.classList.add('hidden');
    form.classList.remove('hidden');
  });
});
