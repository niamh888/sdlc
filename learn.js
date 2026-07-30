// ============================================================
// learn.js  —  Learn page: phase cards, filter, level toggle, progress tracker
// ============================================================
//
// ASYNCHRONOUS DATA LOADING
// The 13 lifecycle topics used to be a hardcoded array in this file — about
// 300 lines of content mixed in with the display logic. They now live in
// data/phases.json and are fetched over the network when the page loads.
//
// Why bother? Two reasons, one practical and one architectural:
//   * Content and code are separate concerns. Correcting a clause reference
//     no longer means editing a JavaScript file and risking a syntax error
//     that breaks the whole page.
//   * The data is now a genuine external resource, which means loading it
//     takes real time and can genuinely fail. That forces the page to
//     handle the three states every async operation has: LOADING, SUCCESS
//     and FAILURE. See async-utils.js for the full explanation.
//
// The trade-off is that the page can no longer be opened by double-clicking
// learn.html — browsers block fetch on the file:// protocol. It must be
// served over HTTP. fetchJSON() detects that case and says so explicitly.
// ============================================================

// ---------- CONFIG ----------
const PHASES_URL = 'data/phases.json';

// Minimum time (ms) the loading indicator stays on screen.
// Without this, a fast load makes the spinner appear and vanish within a
// couple of frames, which reads as a flicker or a glitch rather than as
// progress. Holding it briefly looks deliberate and calm. The cost is that
// very fast loads are slightly slower than they strictly need to be — a
// worthwhile trade for a steadier interface.
const MIN_LOADING_MS = 250;

// ---------- STATE ----------
// `phases` starts EMPTY and is filled in once the fetch resolves. This is
// the single biggest mental shift when moving to asynchronous data: for the
// first moments of the page's life, the data does not exist yet. Every
// function that reads `phases` must therefore cope with it being empty
// rather than assuming content is there. `let` (not `const`) because we
// reassign it after loading.
let phases = [];

// A Set is like an array but guarantees uniqueness — perfect for tracking
// which phase IDs the user has marked as studied (no duplicates possible).
const studiedPhases = new Set();

// Tracks the currently active safety-class filter so applyFilter() always
// knows which button to highlight when the grid re-renders.
let activeFilter = 'all';

// Tracks the currently active training level: 'intro' or 'advanced'.
// Controls which detail bullet array (introDetails / advancedDetails) is
// shown inside each card. Default is introductory on first visit.
let activeLevel = 'intro';

// ---------- LOAD ----------
// The `async` keyword marks this function as asynchronous: it may pause part
// way through, and it always returns a Promise rather than a plain value.
//
// Note there is no try/catch in here. That is deliberate — this function's
// job is to load and render, not to decide how failures are presented.
// The caller (initPhases) owns the error UI, so the error is allowed to
// propagate up to it. Catching an error somewhere you cannot act on it is
// how bugs get hidden.
async function loadPhases() {
  // Promise.all() takes an array of Promises and returns a single Promise
  // that fulfils when EVERY one of them has fulfilled. Both jobs below run
  // CONCURRENTLY — they start together and overlap, so the total wait is
  // the longer of the two, not the sum. Written as two separate awaits
  // instead, the delay would not begin until the fetch had finished, and
  // the page would be needlessly slower.
  //
  // The second entry is the anti-flicker pause described above. We want
  // "data has arrived AND at least 250ms has passed", which is exactly what
  // Promise.all expresses.
  //
  // The square brackets on the left are array destructuring: Promise.all
  // resolves to an array of results in the same order as the input, so
  // element 0 is the parsed JSON. delay() resolves to nothing useful, so we
  // simply do not name element 1.
  //
  // One subtlety: Promise.all rejects IMMEDIATELY if any of its Promises
  // rejects — it does not wait for the others. So a failed fetch surfaces
  // the error straight away instead of sitting through the 250ms pause.
  const [loadedPhases] = await Promise.all([
    fetchJSON(PHASES_URL),
    delay(MIN_LOADING_MS)
  ]);

  // Defensive check. The file could parse as valid JSON yet still not be
  // the shape we expect (an object instead of an array, or an empty array).
  // Validating at the boundary — right where external data enters the
  // program — means the rest of the code can trust `phases` completely.
  if (!Array.isArray(loadedPhases) || loadedPhases.length === 0) {
    throw new Error(PHASES_URL + ' did not contain a list of topics.');
  }

  phases = loadedPhases;
  renderPhases();
}

// initPhases() wraps loadPhases() with all the user-facing state handling:
// show the spinner, hide it on success, show a retry panel on failure.
//
// This function is where the three states of an async operation become three
// branches of actual code.
async function initPhases() {
  const statusEl = document.getElementById('phases-status');
  const errorEl = document.getElementById('phases-error');
  const errorMsgEl = document.getElementById('phases-error-message');
  const controlsEl = document.getElementById('learn-controls');

  // ---- STATE 1: LOADING ----
  // Show the spinner and hide any error left over from a previous attempt.
  // The controls are hidden too: offering filter and level buttons before
  // there is anything to filter would be misleading.
  if (statusEl) statusEl.classList.remove('hidden');
  if (errorEl) errorEl.classList.add('hidden');
  if (controlsEl) controlsEl.classList.add('hidden');

  try {
    // `await` pauses initPhases here until loadPhases finishes. It does NOT
    // freeze the browser — the page stays scrollable and responsive, and any
    // other event handler can still run while we wait.
    await loadPhases();

    // ---- STATE 2: SUCCESS ----
    if (statusEl) statusEl.classList.add('hidden');
    if (controlsEl) controlsEl.classList.remove('hidden');

  } catch (error) {
    // ---- STATE 3: FAILURE ----
    // Because loadPhases() is awaited inside a try block, any error thrown
    // anywhere inside it — network failure, 404, bad JSON, wrong shape —
    // lands here. That single catch covering a whole sequence of async steps
    // is the main practical advantage of async/await over .then() chains.
    if (statusEl) statusEl.classList.add('hidden');
    if (errorEl) errorEl.classList.remove('hidden');

    // error.message is the human-readable text supplied when the Error was
    // created. fetchJSON() writes these to be understandable on their own.
    if (errorMsgEl) errorMsgEl.textContent = error.message;

    // Also log the full error object to the browser console. The page shows
    // the friendly summary; the console keeps the stack trace for whoever
    // has to debug it.
    console.error('Failed to load lifecycle topics:', error);
  }
}

// ---------- RENDER ----------
// Builds all phase cards from the phases array and inserts them into
// #phases-grid. Called once after the data loads; after that, level changes
// use updateDetailsContent() so the rest of the card DOM is not rebuilt.
function renderPhases() {
  const grid = document.getElementById('phases-grid');
  grid.innerHTML = ''; // clear any previous content before rebuilding

  // forEach iterates over the phases array. `phase` is the current object.
  phases.forEach(function (phase) {

    // createElement creates a DOM element in memory — not yet on the page.
    const card = document.createElement('div');
    card.className = 'phase-card';
    card.id = 'phase-' + phase.id;

    // Restore the studied appearance if the user already marked this card.
    if (studiedPhases.has(phase.id)) {
      card.classList.add('studied');
    }

    // map transforms each class letter into an HTML badge string,
    // then join combines the array into one string with no separator.
    const classBadges = phase.classes
      .map(function (c) { return '<span class="class-badge ' + c + '">Class ' + c + '</span>'; })
      .join('');

    // Pick the right detail array based on the current active level.
    // The ternary (condition ? valueIfTrue : valueIfFalse) is shorthand for if/else.
    const details = activeLevel === 'advanced' ? phase.advancedDetails : phase.introDetails;
    const detailItems = details
      .map(function (d) { return '<li>' + d + '</li>'; })
      .join('');

    const isStudied = studiedPhases.has(phase.id);

    card.innerHTML =
      '<div class="phase-header" data-id="' + phase.id + '"' +
          ' role="button" tabindex="0"' +
          ' aria-expanded="false"' +
          ' aria-controls="phase-details-' + phase.id + '">' +
        '<span class="phase-icon" aria-hidden="true">' + phase.icon + '</span>' +
        '<div class="phase-meta">' +
          '<span class="phase-clause">' + phase.clause + '</span>' +
          '<div class="phase-title">' + phase.title + '</div>' +
          '<div class="phase-summary">' + phase.summary + '</div>' +
          '<div class="phase-classes">' + classBadges + '</div>' +
        '</div>' +
        '<span class="phase-chevron" aria-hidden="true">&#9660;</span>' +
      '</div>' +
      '<div class="phase-details" id="phase-details-' + phase.id + '"><ul>' + detailItems + '</ul></div>' +
      '<div class="phase-footer">' +
        '<span class="studied-badge">&#10003; Studied</span>' +
        '<button class="btn btn-secondary mark-studied-btn" data-id="' + phase.id + '"' + (isStudied ? ' disabled' : '') + '>' +
          (isStudied ? '&#10003; Studied' : 'Mark as Studied') +
        '</button>' +
      '</div>';

    grid.appendChild(card);
  });

  document.getElementById('progress-total').textContent = phases.length;
  applyFilter(activeFilter);
  updateProgress();
}

// ---------- LEVEL TOGGLE ----------
// updateDetailsContent() swaps the bullet text inside every card without
// rebuilding the card DOM. This is intentional: rebuilding the entire grid
// (via renderPhases) would reset all expanded/collapsed states and lose the
// user's studied progress. Instead, we reach into each card's existing <ul>
// and replace only the <li> elements.
//
// Note this is safe to call before the data has loaded: `phases` is an empty
// array at that point, so forEach simply does nothing. Functions that read
// asynchronously-loaded data need to tolerate it not being there yet.
function updateDetailsContent() {
  phases.forEach(function (phase) {
    // Find the already-rendered details panel for this phase by its ID.
    const detailsEl = document.getElementById('phase-details-' + phase.id);
    if (!detailsEl) return; // safety guard: skip if not yet in the DOM

    const list = detailsEl.querySelector('ul');
    if (!list) return;

    // Swap in the correct detail array for the new level.
    const details = activeLevel === 'advanced' ? phase.advancedDetails : phase.introDetails;

    // Setting innerHTML replaces all the <li> children at once.
    // map() turns each string into '<li>text</li>', join('') concatenates them.
    list.innerHTML = details.map(function (d) { return '<li>' + d + '</li>'; }).join('');
  });
}

// setLevel() is called when the user clicks the Introductory or Advanced button.
// It updates three things in sequence: the in-memory state, the persisted
// preference, and the visible bullet content.
function setLevel(level) {
  activeLevel = level; // 1. update the JS variable that all other functions read

  // 2. localStorage is a browser key/value store that survives page reloads
  // and navigation. Saving the level here means the quiz page (a completely
  // separate HTML file) can read the same value when it chooses which
  // question set to fetch.
  //
  // Worth noting for contrast with everything else in this file:
  // localStorage is SYNCHRONOUS. This line blocks the single thread until
  // the write completes. That is fine for a short string like this, but it
  // is why localStorage is a poor choice for large amounts of data — and
  // why its async replacement, IndexedDB, exists.
  localStorage.setItem('62304_trainingLevel', level);

  // 3. Highlight only the button that matches the new level; remove 'active'
  // from the other. classList.toggle(name, boolean) adds when true, removes when false.
  document.querySelectorAll('.level-btn').forEach(function (btn) {
    btn.classList.toggle('active', btn.dataset.level === level);
  });

  updateDetailsContent(); // 4. swap the bullet text in all cards
}

// ---------- CLICK HANDLER (event delegation) ----------
function handleCardClick(e) {
  const studiedBtn = e.target.closest('.mark-studied-btn');
  const header = e.target.closest('.phase-header');

  if (studiedBtn) {
    markStudied(studiedBtn.dataset.id);
    return;
  }

  if (header) {
    togglePhaseCard(header.dataset.id);
  }
}

// ---------- TOGGLE EXPAND / COLLAPSE ----------
function togglePhaseCard(id) {
  const card = document.getElementById('phase-' + id);
  if (card) {
    card.classList.toggle('expanded');
    const header = card.querySelector('.phase-header');
    if (header) {
      header.setAttribute('aria-expanded', card.classList.contains('expanded') ? 'true' : 'false');
    }
  }
}

// ---------- MARK AS STUDIED ----------
function markStudied(id) {
  if (studiedPhases.has(id)) return;

  studiedPhases.add(id);

  const card = document.getElementById('phase-' + id);
  if (!card) return;

  card.classList.add('studied');

  const btn = card.querySelector('.mark-studied-btn');
  if (btn) {
    btn.textContent = '✓ Studied';
    btn.disabled = true;
  }

  updateProgress();
}

// ---------- FILTER BY SAFETY CLASS ----------
function applyFilter(classFilter) {
  activeFilter = classFilter;

  document.querySelectorAll('.filter-btn').forEach(function (btn) {
    btn.classList.toggle('active', btn.dataset.filter === classFilter);
  });

  phases.forEach(function (phase) {
    const card = document.getElementById('phase-' + phase.id);
    if (!card) return;
    const visible = classFilter === 'all' || phase.classes.indexOf(classFilter) !== -1;
    card.classList.toggle('hidden', !visible);
  });
}

// ---------- PROGRESS BAR ----------
function updateProgress() {
  const count = studiedPhases.size;
  const total = phases.length;
  const pct = total > 0 ? (count / total) * 100 : 0;

  document.getElementById('progress-count').textContent = count;
  document.getElementById('progress-bar').style.width = pct + '%';

  const container = document.querySelector('.progress-bar-container');
  if (container) {
    container.setAttribute('aria-valuenow', Math.round(pct));
  }
}

// ---------- INIT ----------
// DOMContentLoaded fires when the HTML is fully parsed but before images load.
// Wrapping all setup here ensures getElementById etc. find their targets.
//
// The controls are wired up BEFORE the data request starts, and the request
// is the last thing we do. That ordering matters: it means the page is
// interactive during the load rather than after it. If the user clicks
// Advanced while the fetch is still in flight, setLevel() records the choice
// and renderPhases() picks it up when the data arrives.
document.addEventListener('DOMContentLoaded', function () {

  // Restore the level the user last chose. localStorage.getItem() returns
  // null if the key has never been set (first visit), so we only override
  // the 'intro' default if the stored value is explicitly 'advanced'.
  const savedLevel = localStorage.getItem('62304_trainingLevel');
  if (savedLevel === 'advanced') {
    activeLevel = 'advanced'; // set before renderPhases() runs
  }

  // Sync the level button highlight to match the restored activeLevel.
  document.querySelectorAll('.level-btn').forEach(function (btn) {
    btn.classList.toggle('active', btn.dataset.level === activeLevel);
  });

  // EVENT DELEGATION — one listener on the grid handles clicks for ALL cards.
  // This is also what makes the listener safe to attach before the cards
  // exist: the listener lives on the container, which is already in the HTML,
  // so cards added later by renderPhases() are covered automatically. A
  // listener per card would have to wait for the data and be re-attached
  // on every re-render.
  const grid = document.getElementById('phases-grid');
  grid.addEventListener('click', handleCardClick);

  // Keyboard delegation — Enter and Space activate the focused header, matching
  // the native button behaviour that sighted keyboard users expect.
  grid.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const header = e.target.closest('.phase-header');
    if (header) {
      e.preventDefault(); // stop Space from scrolling the page
      togglePhaseCard(header.dataset.id);
    }
  });

  // Wire up the safety-class filter buttons (All / Class A / B / C).
  document.querySelectorAll('.filter-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      applyFilter(btn.dataset.filter);
    });
  });

  // Wire up the level toggle buttons (Introductory / Advanced).
  // data-level on each button tells setLevel() which level was chosen.
  document.querySelectorAll('.level-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      setLevel(btn.dataset.level);
    });
  });

  // RETRY — lets the user re-attempt a failed load without reloading the page.
  // Any async operation that can fail should offer a way to try again;
  // "reload the whole page" is a poor substitute because it throws away
  // everything else the user has done.
  const retryBtn = document.getElementById('phases-retry');
  if (retryBtn) {
    retryBtn.addEventListener('click', function () {
      initPhases(); // returns a Promise; nothing here needs its result
    });
  }

  // ---------- UPDATE BANNER ----------
  // The banner starts hidden in the HTML (class="update-banner hidden").
  // We reveal it here unless the user has already dismissed it this session.
  // localStorage persists the dismissal across page reloads so it doesn't
  // reappear every time the user returns to the Learn page.
  const banner = document.getElementById('update-banner');
  const bannerClose = document.getElementById('update-banner-close');

  if (banner) {
    if (localStorage.getItem('62304_bannerDismissed') !== 'true') {
      // Remove the 'hidden' class to reveal the banner.
      banner.classList.remove('hidden');
    }
    if (bannerClose) {
      bannerClose.addEventListener('click', function () {
        banner.classList.add('hidden');
        localStorage.setItem('62304_bannerDismissed', 'true');
      });
    }
  }

  // Finally, start the data request. initPhases() is async, so this line
  // returns immediately with a Promise while the fetch continues in the
  // background. We do not await it because there is nothing left to do
  // afterwards — and because initPhases() already handles its own errors
  // internally, there is no unhandled rejection to worry about.
  initPhases();
});
