// ============================================================
// reviews.js  —  Home page: participant reviews (list + submit form)
// ============================================================
//
// WHAT THIS FILE DOES, IN PLAIN TERMS
// The hardcoded testimonial quotes that used to live in index.html are gone
// (see git history — they moved to stjohnlynch.com). This is their
// replacement: real reviews, written by signed-in participants and stored
// in this site's own backend database (see backend/app/models.py's
// CourseReview), shown here once Niamh has approved them from the backend's
// own admin panel at /admin (see backend/app/admin.py).
//
// A review only ever appears to the public once its `status` is
// 'approved' — enforced by the backend's GET /reviews route itself (see
// backend/app/routers/reviews.py), which is hardcoded to only ever query
// for approved rows. This file just displays whatever that endpoint
// returns; it has no way to ask for anything else.
//
// Loaded on index.html only, after auth.js (needs apiFetch() and
// getCurrentSession() it defines) and before nothing in particular —
// nav.js/theme.js do not depend on this file or vice versa.
// ============================================================

// Fixed id of the one course this site currently teaches — same row
// backend/seed.py creates and the same pattern quiz.js uses for
// COURSE_VERSION_ID (a constant here avoids a request just to look up "the
// course" every time this file runs).
const REVIEWS_COURSE_ID = '11111111-1111-1111-1111-111111111111';

// ---------- STAR RENDERING ----------
// Turns a 1-5 integer into the filled/empty star glyphs used both in each
// review card and in the "thanks, here's what you submitted" confirmation.
// Kept as one function so the two places can never draw stars differently.
function starGlyphs(rating) {
  return '★★★★★☆☆☆☆☆'.slice(5 - rating, 10 - rating);
}

// ---------- LOAD + RENDER APPROVED REVIEWS ----------
async function loadApprovedReviews() {
  const listEl = document.getElementById('reviews-list');
  const emptyEl = document.getElementById('reviews-empty');
  const errorEl = document.getElementById('reviews-load-error');
  if (!listEl) return; // this page has no reviews section

  try {
    const reviews = await apiFetch('/reviews?course_id=' + REVIEWS_COURSE_ID);

    listEl.innerHTML = '';

    if (!reviews || reviews.length === 0) {
      if (emptyEl) emptyEl.classList.remove('hidden');
      return;
    }
    if (emptyEl) emptyEl.classList.add('hidden');

    // Built with createElement/textContent rather than innerHTML, because
    // review.comment and review.participant_name are TEXT TYPED BY A
    // VISITOR. Using innerHTML here would let someone's review comment
    // contain HTML that runs in every other visitor's browser (a stored
    // XSS attack) — textContent inserts it as inert text no matter what it
    // contains. This is the one part of the site handling that kind of
    // input, which is why it is the one part that cannot use the innerHTML
    // shortcut used elsewhere (e.g. populateCertificate() in quiz.js, where
    // every string involved is our own hardcoded text, not a visitor's).
    reviews.forEach(function (review) {
      const card = document.createElement('blockquote');
      card.className = 'review-card';

      const starsEl = document.createElement('p');
      starsEl.className = 'review-stars';
      starsEl.setAttribute('aria-label', review.rating + ' out of 5 stars');
      starsEl.textContent = starGlyphs(review.rating);

      const quoteEl = document.createElement('p');
      quoteEl.className = 'review-quote';
      quoteEl.textContent = review.comment;

      const footerEl = document.createElement('footer');
      footerEl.className = 'review-attribution';
      const cite = document.createElement('cite');
      cite.textContent = review.participant_name;
      footerEl.appendChild(document.createTextNode('— '));
      footerEl.appendChild(cite);

      card.append(starsEl, quoteEl, footerEl);
      listEl.appendChild(card);
    });

  } catch (error) {
    console.error('Could not load reviews:', error);
    if (errorEl) errorEl.classList.remove('hidden');
  }
}

// ---------- REVIEW FORM STATE ----------
// Decides which of the form's states to show for the CURRENT signed-in user
// (or the signed-out prompt). Re-run after a successful submit so the form
// immediately reflects the new row without a page reload.
async function refreshReviewFormState() {
  const signedOutEl = document.getElementById('review-signed-out');
  const formEl = document.getElementById('review-form');
  const existingEl = document.getElementById('review-existing-status');
  if (!formEl) return; // this page has no review form

  let session;
  try {
    session = await getCurrentSession();
  } catch (error) {
    console.error('Could not check sign-in status for the review form:', error);
    session = null;
  }

  if (!session) {
    if (signedOutEl) signedOutEl.classList.remove('hidden');
    formEl.classList.add('hidden');
    if (existingEl) existingEl.classList.add('hidden');
    return;
  }
  if (signedOutEl) signedOutEl.classList.add('hidden');

  // A signed-in user gets at most one row (see the unique(user_id,
  // course_id) constraint in backend/app/models.py) — GET /reviews/me
  // returns null rather than an error when there isn't one yet, which is
  // the normal case for a first-time visitor.
  let existingReview = null;
  try {
    existingReview = await apiFetch('/reviews/me?course_id=' + REVIEWS_COURSE_ID);
  } catch (error) {
    console.error('Could not check for an existing review:', error);
    // Fall through and show the form anyway — worst case a resubmit fails
    // with the real error, which is still an honest outcome.
  }

  if (existingReview) {
    formEl.classList.add('hidden');
    if (existingEl) {
      existingEl.classList.remove('hidden');
      const statusMessages = {
        pending: 'Your review has been submitted and is awaiting approval before it appears publicly. Thank you!',
        approved: 'Your review has been approved and appears below. Thank you!',
        rejected: 'Your review was not approved for public display.'
      };
      existingEl.textContent = statusMessages[existingReview.status] || '';
    }
    return;
  }

  // No existing row: show the fresh form.
  if (existingEl) existingEl.classList.add('hidden');
  formEl.classList.remove('hidden');

  // Prefill the name the same way quiz.js does, so a returning learner isn't
  // asked to retype it.
  if (session.user.full_name) {
    const nameInput = document.getElementById('review-name');
    if (nameInput && !nameInput.value) nameInput.value = session.user.full_name;
  }
}

// ---------- SUBMIT ----------
async function submitReview(event) {
  event.preventDefault();

  const nameInput = document.getElementById('review-name');
  const commentInput = document.getElementById('review-comment');
  const submitBtn = document.getElementById('review-submit');
  const errorEl = document.getElementById('review-form-error');
  const ratingChecked = document.querySelector('input[name="review-rating"]:checked');

  if (errorEl) { errorEl.textContent = ''; errorEl.classList.add('hidden'); }

  const name = nameInput ? nameInput.value.trim() : '';
  const comment = commentInput ? commentInput.value.trim() : '';
  const rating = ratingChecked ? Number(ratingChecked.value) : 0;

  // Validate before touching the network, same reasoning as startQuiz() in
  // quiz.js — an invalid submission is rejected instantly, not after a
  // round trip that was always going to fail.
  if (!name || !comment || rating < 1 || rating > 5) {
    if (errorEl) {
      errorEl.textContent = 'Please choose a star rating, and fill in your name and a comment.';
      errorEl.classList.remove('hidden');
    }
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.setAttribute('aria-busy', 'true');
    submitBtn.textContent = 'Submitting…';
  }

  try {
    const session = await getCurrentSession();
    if (!session) throw new Error('you are signed out, so this review could not be saved');

    // `status` is never sent — the backend always creates a new review as
    // 'pending' regardless of what a request contains (see
    // backend/app/routers/reviews.py), so there is no point (and no way)
    // to set it from here.
    await apiFetch('/reviews', {
      method: 'POST',
      body: JSON.stringify({
        course_id: REVIEWS_COURSE_ID,
        participant_name: name,
        rating: rating,
        comment: comment
      })
    });

    // Re-check the form state: this now finds the just-inserted row and
    // swaps the form for the "awaiting approval" message on its own.
    await refreshReviewFormState();

  } catch (error) {
    console.error('Could not save review:', error);
    if (errorEl) {
      errorEl.textContent = 'Could not save your review (' + error.message + '). Please try again.';
      errorEl.classList.remove('hidden');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.removeAttribute('aria-busy');
      submitBtn.textContent = 'Submit Review';
    }
  }
}

// ---------- INIT ----------
document.addEventListener('DOMContentLoaded', function () {
  const formEl = document.getElementById('review-form');
  if (!formEl) return; // not on this page

  loadApprovedReviews();
  refreshReviewFormState();

  formEl.addEventListener('submit', submitReview);

  // Keep the form in sync with sign-in/out happening on this same page (the
  // nav's Log out button, or a sign-in completed in another tab) — same
  // event auth.js already notifies for the nav itself (see its
  // onAuthStateChange()).
  onAuthStateChange(function () {
    refreshReviewFormState();
  });
});
