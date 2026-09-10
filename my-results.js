// ============================================================
// my-results.js  —  "My Results" page: past quiz attempts + certificate reprint
// ============================================================
//
// WHAT THIS FILE DOES, IN PLAIN TERMS
// Every quiz attempt has always been saved to Supabase's quiz_attempts table
// (see saveAttemptToSupabase() in quiz.js) — user, score, level, and both a
// started_at and a completed_at timestamp. Until now, nothing on the site
// ever read that data back. This page is that missing other half: it fetches
// every attempt belonging to the signed-in user and lists it, most recent
// first, and — for any attempt that passed — lets them reprint that exact
// certificate on demand, using the REAL date they completed it, not today's
// date.
//
// Reuses the SAME #certificate markup, ids and CSS that quiz.js's
// populateCertificate() fills in (see my-results.html) — the two are kept as
// separate functions rather than shared, because the two situations are
// subtly different: quiz.js is filling in a certificate for the attempt that
// JUST happened, using values already sitting in quizState; this file is
// filling one in for a stored row that could be months old, using only what
// was saved about it in the database.
// ============================================================

// ---------- LOAD ----------
async function loadMyResults() {
  const authRequiredEl = document.getElementById('results-auth-required');
  const loadingEl = document.getElementById('results-loading');
  const errorEl = document.getElementById('results-error');
  const errorMsgEl = document.getElementById('results-error-message');
  const emptyEl = document.getElementById('results-empty');
  const gridEl = document.getElementById('results-grid');

  authRequiredEl.classList.add('hidden');
  errorEl.classList.add('hidden');
  emptyEl.classList.add('hidden');
  gridEl.innerHTML = '';
  loadingEl.classList.remove('hidden');

  let session;
  try {
    session = await getCurrentSession();
  } catch (error) {
    console.error('Could not check sign-in status:', error);
    session = null;
  }

  if (!session) {
    loadingEl.classList.add('hidden');
    authRequiredEl.classList.remove('hidden');
    return; // nothing past this point can do anything useful while signed out
  }

  try {
    // course_versions(...) and its nested courses(...) are a FOREIGN KEY
    // EMBED — PostgREST (what Supabase's client talks to) follows the
    // course_version_id -> course_versions -> courses relationship server
    // side and hands back each attempt with its course details already
    // attached, in one request, rather than this file making a second query
    // per row. Each of those two tables has its own "publicly readable"
    // policy (see supabase/schema.sql), so the embed succeeds even though
    // this request is really only authorised to read the quiz_attempts
    // rows themselves via the "Users read their own attempts" policy.
    const { data, error } = await supabaseClient
      .from('quiz_attempts')
      .select('id, level, participant_name, score, total, pct, passed, started_at, completed_at, course_versions(version_label, courses(title))')
      .eq('user_id', session.user.id)
      .order('completed_at', { ascending: false });
    if (error) throw error;

    loadingEl.classList.add('hidden');

    if (!data || data.length === 0) {
      emptyEl.classList.remove('hidden');
      return;
    }

    data.forEach(renderResultCard);

  } catch (error) {
    console.error('Could not load quiz results:', error);
    loadingEl.classList.add('hidden');
    errorMsgEl.textContent = error.message;
    errorEl.classList.remove('hidden');
  }
}

// ---------- RENDER ONE CARD ----------
function renderResultCard(attempt) {
  const gridEl = document.getElementById('results-grid');

  const dateStr = new Date(attempt.completed_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
  const levelLabel = attempt.level === 'advanced' ? 'Advanced' : 'Introductory';

  const card = document.createElement('div');
  card.className = 'result-card';

  const badgesEl = document.createElement('p');
  badgesEl.className = 'result-badges';
  const levelBadge = document.createElement('span');
  levelBadge.className = 'level-notice-badge ' + (attempt.level === 'advanced' ? 'level-notice-advanced' : 'level-notice-intro');
  levelBadge.textContent = levelLabel;
  const passBadge = document.createElement('span');
  passBadge.className = 'level-notice-badge ' + (attempt.passed ? 'result-badge-pass' : 'result-badge-fail');
  passBadge.textContent = attempt.passed ? 'Passed' : 'Not Passed';
  badgesEl.append(levelBadge, passBadge);

  const dateEl = document.createElement('p');
  dateEl.className = 'result-date';
  dateEl.textContent = 'Completed ' + dateStr;

  const scoreEl = document.createElement('p');
  scoreEl.className = 'result-score';
  scoreEl.textContent = attempt.score + ' / ' + attempt.total + ' (' + attempt.pct + '%)';

  card.append(badgesEl, dateEl, scoreEl);

  // Only a PASSED attempt ever had a certificate to begin with — quiz.js
  // only shows the Download Certificate button once pct >= 80, so there is
  // nothing genuine to reprint for a failed one.
  if (attempt.passed) {
    const certBtn = document.createElement('button');
    certBtn.type = 'button';
    certBtn.className = 'btn btn-secondary';
    certBtn.textContent = 'View Certificate';
    certBtn.addEventListener('click', function () {
      printCertificateFor(attempt);
    });
    card.appendChild(certBtn);
  }

  gridEl.appendChild(card);
}

// ---------- REPRINT A STORED CERTIFICATE ----------
// Fills in the same #certificate template quiz.js uses, but entirely from
// this ONE stored row — see the file header comment for why this is a
// separate function rather than a shared one.
function printCertificateFor(attempt) {
  const isAdvanced = attempt.level === 'advanced';
  const levelLabel = isAdvanced ? 'Advanced Level' : 'Introductory Level';
  const levelDesc = isAdvanced
    ? 'An in-depth study of IEC 62304:2006+AMD1:2015'
    : 'An introduction to IEC 62304:2006+AMD1:2015';

  // Falls back to the course's only current title if the foreign-key embed
  // came back empty for any reason (it shouldn't — courses/course_versions
  // rows are never deleted — but a certificate must never fail to print
  // over a missing display label).
  const courseTitle = (attempt.course_versions && attempt.course_versions.courses && attempt.course_versions.courses.title)
    || 'IEC 62304 Essentials';

  // The date that matters here is when the attempt was actually completed —
  // NOT today, which is the whole point of a reprint. new Date() is only
  // ever used elsewhere (quiz.js) because "today" and "completion date" are
  // the same moment the first time a certificate is printed.
  const dateStr = new Date(attempt.completed_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  document.getElementById('cert-name').textContent = attempt.participant_name;
  document.getElementById('cert-score').textContent = attempt.score + ' / ' + attempt.total + ' (' + attempt.pct + '%)';
  document.getElementById('cert-date').textContent = dateStr;
  document.getElementById('cert-course-name').textContent = courseTitle + ' — ' + levelLabel;
  // Matches quiz.js's populateCertificate() wording exactly — a reprint
  // should read identically to the original, not just carry the same data.
  document.getElementById('cert-standard').innerHTML = levelDesc + '<br>Medical device software — Software life cycle processes';
  document.getElementById('cert-id').textContent = attempt.id;

  const verifyUrl = window.location.origin
    + window.location.pathname.replace(/my-results\.html$/, 'verify.html')
    + '?id=' + attempt.id;
  document.getElementById('cert-verify-url').textContent = verifyUrl;

  // Unlike downloadCertificate() in quiz.js, no delay() is needed before
  // this — that one exists purely to let the browser paint a "Preparing
  // certificate…" label onto the button before window.print() blocks
  // everything, and this click handler never changes the button's text in
  // the first place.
  window.print();
}

// ---------- INIT ----------
document.addEventListener('DOMContentLoaded', function () {
  if (!document.getElementById('results-grid')) return; // not on this page

  loadMyResults();

  document.getElementById('results-retry').addEventListener('click', loadMyResults);

  // Signing in or out on this same page (e.g. clicking Log out) should
  // immediately reflect in what this page shows, same as reviews.js does
  // for the review form.
  supabaseClient.auth.onAuthStateChange(function () {
    loadMyResults();
  });
});
