// ============================================================
// verify.js  —  Certificate verification lookup
// ============================================================
//
// WHAT THIS FILE DOES, IN PLAIN TERMS
// The certificate quiz.js prints carries a "Certificate ID" — really just
// the row ID of that attempt in this site's own backend database (see
// populateCertificate() in quiz.js). This page sends that ID to
// GET /certificates/{id}/verify (see backend/app/routers/certificates.py
// for the full explanation of why that is its own narrow endpoint rather
// than a general "look up any attempt" one). That endpoint is the only
// thing on this page that touches the database; everything below is just
// calling it and showing whichever of its two possible outcomes actually
// happened.
//
// Deliberately requires NO sign-in — an employer or auditor checking a
// certificate they were handed will usually not have (and should not need)
// an account on this site at all.
// ============================================================

// Loose UUID shape check — not a full RFC 4122 validator, just enough to
// catch an obviously mistyped or incomplete ID before spending a network
// round trip on it. The database is still the real check: this only saves
// the visitor a wait on something that could never have matched.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------- SHOW EXACTLY ONE RESULT STATE ----------
// Same "show exactly one matching state" idea as auth.js's updateAuthNav —
// at most one of found/not-found is ever visible, and starting a new lookup
// clears whichever was showing before.
function showResult(state) {
  document.getElementById('verify-found').classList.toggle('hidden', state !== 'found');
  document.getElementById('verify-not-found').classList.toggle('hidden', state !== 'not-found');
}

// ---------- LOOKUP ----------
async function verifyCertificate(certId) {
  const idInput = document.getElementById('verify-id');
  const errorEl = document.getElementById('verify-error');
  const idErrorEl = document.getElementById('verify-id-error');
  const submitBtn = document.getElementById('verify-submit');

  errorEl.classList.add('hidden');
  errorEl.textContent = '';
  idErrorEl.textContent = '';
  idInput.classList.remove('error');
  showResult(null);

  if (!UUID_PATTERN.test(certId)) {
    idInput.classList.add('error');
    idErrorEl.textContent = 'That doesn\'t look like a complete Certificate ID — check you copied the whole thing.';
    return;
  }

  submitBtn.disabled = true;
  submitBtn.setAttribute('aria-busy', 'true');
  submitBtn.textContent = 'Verifying…';

  try {
    // A 404 here (see backend/app/routers/certificates.py) means "no
    // certificate", not a real error — apiFetch() throws for it the same
    // as any other non-2xx response, so that is caught and handled as its
    // own case below rather than falling through to the generic error
    // message.
    const cert = await apiFetch('/certificates/' + encodeURIComponent(certId) + '/verify');

    document.getElementById('verify-name').textContent = cert.participant_name;
    document.getElementById('verify-course').textContent = cert.course_title + ' — ' + cert.version_label;
    document.getElementById('verify-score').textContent = cert.score + ' / ' + cert.total + ' (' + cert.pct + '%)';
    document.getElementById('verify-date').textContent = new Date(cert.completed_at).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
    showResult('found');

  } catch (error) {
    if (error.status === 404) {
      showResult('not-found');
    } else {
      console.error('Certificate verification failed:', error);
      errorEl.textContent = 'Could not check this certificate right now (' + error.message + '). Please try again.';
      errorEl.classList.remove('hidden');
    }

  } finally {
    submitBtn.disabled = false;
    submitBtn.removeAttribute('aria-busy');
    submitBtn.textContent = 'Verify';
  }
}

// ---------- INIT ----------
document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('verify-form');
  const idInput = document.getElementById('verify-id');
  if (!form) return;

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    verifyCertificate(idInput.value.trim());
  });

  // A certificate's printed verify URL includes ?id=... (see quiz.js's
  // populateCertificate()) so a click — or a scanned QR code, if this is
  // ever printed as one — lands here with the lookup already run, instead
  // of asking the visitor to also copy-paste the ID by hand.
  const prefilledId = new URLSearchParams(window.location.search).get('id');
  if (prefilledId) {
    idInput.value = prefilledId;
    verifyCertificate(prefilledId.trim());
  }
});
