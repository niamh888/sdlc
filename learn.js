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
// Two data files, deliberately separate:
//   phases.json        — the course content (what each process area is about)
//   applicability.json — which requirements apply to which safety class
//
// They are split because they are different kinds of thing with different review
// needs. The content is editorial; the applicability mapping is regulatory fact
// transcribed from IEC 62304 Table A.1 and cross-checked against the [Class ...]
// tags in the normative text. Keeping the mapping in its own file means it can be
// checked against the standard on its own, without wading through prose.
const PHASES_URL = 'data/phases.json';
const APPLICABILITY_URL = 'data/applicability.json';

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

// STORAGE — localStorage, not sessionStorage. This went through two designs
// before landing here, and both earlier ones failed on real usage, not just
// in theory:
//
//   1. Nothing persisted at all (the original design). Broke the moment
//      "Back to Learn" started actually navigating (see openCardFromHash()
//      below) instead of silently failing: that navigation reloads
//      learn.html, which wipes any in-memory record of what was previewed.
//
//   2. sessionStorage (the first fix). Survives a reload of the SAME tab,
//      which fixed the case above — but every Preview link opens a genuinely
//      NEW tab (target="_blank" with rel="noopener", deliberately, for
//      security), and sessionStorage is scoped per tab. rel="noopener"
//      specifically prevents the new tab from inheriting anything from the
//      one that opened it. Study three topics — Preview, back, mark studied,
//      Preview, back, mark studied, ... — and each "Preview" spawns another
//      independent tab that has never heard of the ones before it. Only
//      whichever tab you happen to end up looking at "remembers" anything,
//      which is exactly the "only the most recent one" bug this was rewritten
//      to fix.
//
// localStorage solves it because it is not scoped to a tab at all — every
// tab on this origin reads and writes the SAME store, regardless of how
// each tab was opened. The real trade-off, and it is a genuine one, not a
// technicality: progress now persists after you close the browser entirely,
// the same way `62304_trainingLevel` and the theme choice already do. That
// is a step up from "resets whenever you leave", which is what most people
// actually want from a progress tracker — but it does mean this had to move
// into the privacy notice's local-storage table (see privacy.html) rather
// than staying out of it.
const STUDIED_STORAGE_KEY = '62304_studiedPhases';
const PREVIEWED_STORAGE_KEY = '62304_previewedDocs';

// Reads a JSON array of ids back out of storage into a Set. Wrapped in
// try/catch because localStorage can throw (not just return null) in a few
// real situations — Safari private browsing historically, or third-party-
// storage restrictions on an embedded page — and a corrupted or hand-edited
// value would otherwise throw out of JSON.parse. Either way the safe fallback
// is the same as before any of this existed: start with nothing recorded.
function loadIdSet(key) {
  try {
    const raw = localStorage.getItem(key);
    const ids = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(ids) ? ids : []);
  } catch (e) {
    return new Set();
  }
}

// The inverse — called every time either Set changes, not batched, because
// there is no "page unload" moment to rely on: the whole point is surviving
// a navigation that the page does not get to intercept.
function saveIdSet(key, set) {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch (e) {
    // Storage unavailable or full — the Set itself still works for the rest
    // of this tab's life, it just will not be seen by any other tab, and
    // will not survive this tab closing. No worse than the behaviour before
    // persistence was used at all.
  }
}

// A Set is like an array but guarantees uniqueness — perfect for tracking
// which phase IDs the user has marked as studied (no duplicates possible).
// Restored from localStorage rather than starting empty, so a topic marked
// studied earlier — in this tab, or any other tab that was ever opened —
// stays marked. renderPhases() reads this when it first builds each card,
// so a restored id needs no extra wiring beyond this line.
const studiedPhases = loadIdSet(STUDIED_STORAGE_KEY);

// Which phases the visitor has actually opened the example document for —
// via either the Preview link or the Download link, either one counts as
// having engaged with it. Checked by markStudied() before it allows a topic
// to be marked studied. Restored from localStorage for the same reason as
// studiedPhases above — see the STORAGE comment there for the full case.
const previewedDocs = loadIdSet(PREVIEWED_STORAGE_KEY);

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
  // Promise.all() takes an array of Promises and returns a single Promise that
  // fulfils when EVERY one of them has fulfilled. All three jobs below run
  // CONCURRENTLY — they start together and overlap, so the total wait is the
  // longest of the three, not the sum. Written as separate awaits instead, each
  // download would wait for the previous one to finish and the page would be
  // needlessly slower for no benefit: neither file depends on the other.
  //
  // The third entry is the anti-flicker pause described above. We want "both
  // files have arrived AND at least 250ms has passed", which is exactly what
  // Promise.all expresses.
  //
  // The square brackets on the left are array destructuring: Promise.all
  // resolves to an array of results in the same order as the input. delay()
  // resolves to nothing useful, so element 2 is simply not named.
  //
  // One subtlety: Promise.all rejects IMMEDIATELY if any of its Promises
  // rejects — it does not wait for the others. So a failed fetch surfaces the
  // error straight away instead of sitting through the 250ms pause.
  const [loadedPhases, applicability] = await Promise.all([
    fetchJSON(PHASES_URL),
    fetchJSON(APPLICABILITY_URL),
    delay(MIN_LOADING_MS)
  ]);

  // Defensive check. A file can parse as valid JSON yet still not be the shape
  // we expect (an object instead of an array, or an empty array). Validating at
  // the boundary — right where external data enters the program — means the rest
  // of the code can trust `phases` completely.
  if (!Array.isArray(loadedPhases) || loadedPhases.length === 0) {
    throw new Error(PHASES_URL + ' did not contain a list of topics.');
  }
  if (!applicability || !applicability.clauses) {
    throw new Error(APPLICABILITY_URL + ' did not contain a clauses map.');
  }

  mergeApplicability(loadedPhases, applicability.clauses);

  phases = loadedPhases;
  renderPhases();
}

// Attaches the sub-clause mapping to each topic and CHECKS THE TWO FILES AGREE.
//
// This function exists because of a real bug. Clause 7 (Software Risk Management)
// was recorded as applying only to Class B and C, which is wrong — §7.4.1 applies
// to every class. The filter silently hid the whole clause from Class A users,
// implying that Class A software needs no risk management, which is the opposite
// of the truth. Two further errors were found the same way: Clause 5.3 was marked
// as applying to Class A when it has no Class A requirement at all, and Clause 5.4
// was marked Class C only when §5.4.1 reaches Class B.
//
// The lesson: a single hand-maintained list of classes per clause had no way to be
// wrong *visibly*. Nothing contradicted it, so nothing caught it. Now the
// clause-level list must equal the union of its sub-clause classes, and if the two
// disagree the page refuses to render and says which clause is at fault. A loud
// failure on a data error is far better than a page that quietly teaches something
// incorrect — especially here, where a reader could take the wrong lesson into a
// real regulatory submission.
function mergeApplicability(loadedPhases, clauseMap) {
  const classOrder = ['A', 'B', 'C'];

  loadedPhases.forEach(function (phase) {
    const subClauses = clauseMap[phase.id];

    if (!Array.isArray(subClauses) || subClauses.length === 0) {
      throw new Error('No sub-clause applicability recorded for ' + phase.clause +
                      ' (id "' + phase.id + '") in ' + APPLICABILITY_URL + '.');
    }

    // A sub-clause with an empty classes array was removed by Amendment 1 and
    // carries no requirement, so it must not count towards the roll-up.
    const live = subClauses.filter(function (sc) {
      return Array.isArray(sc.classes) && sc.classes.length > 0;
    });

    const derived = classOrder.filter(function (cls) {
      return live.some(function (sc) { return sc.classes.indexOf(cls) !== -1; });
    });

    if (derived.join('') !== phase.classes.slice().sort().join('')) {
      throw new Error(
        phase.clause + ': the safety classes in phases.json (' + phase.classes.join('/') +
        ') do not match the sub-clauses in applicability.json (' + derived.join('/') +
        '). One of the two files is wrong — check against the standard before publishing.'
      );
    }

    phase.subClauses = subClauses;
  });
}

// ---------- APPLICABILITY HELPERS ----------
// How a whole clause relates to one safety class. Three answers, not two, which
// is the point of the sub-clause data: "Clause 5.4 applies to Class B" is true but
// misleading on its own, because only §5.4.1 of it does.
//   'full'    every requirement in the clause applies at this class
//   'partial' some do and some do not
//   'none'    the clause has no requirement at this class
function applicabilityAt(phase, cls) {
  const live = (phase.subClauses || []).filter(function (sc) {
    return Array.isArray(sc.classes) && sc.classes.length > 0;
  });
  if (live.length === 0) return 'none';

  const applying = live.filter(function (sc) { return sc.classes.indexOf(cls) !== -1; });
  if (applying.length === 0) return 'none';
  return applying.length === live.length ? 'full' : 'partial';
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

    // The cards this reads now exist — see openCardFromHash() for why this
    // has to wait until here rather than running on page load directly.
    openCardFromHash();

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

    // Restore the "opened" mark — filled book icon, Mark as Studied in place
    // of Read More — for anything already previewed or studied earlier in
    // this session. The Read More / Mark as Studied swap is keyed off
    // .opened, not .studied (see the footer markup below), so without this
    // a restored studied topic would render its footer as "Read More" again
    // even while the button beside it correctly says "Studied" — the two
    // would visibly disagree. previewedDocs is included too so a topic the
    // reader previewed but has not yet marked studied does not regress to
    // looking unopened after a reload.
    if (previewedDocs.has(phase.id) || studiedPhases.has(phase.id)) {
      card.classList.add('opened');
    }
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
        // Every clause uses the same book icon rather than a distinct emoji per
        // topic — the emoji varied wildly in weight and tone across browsers,
        // which read as decoration rather than meaning. The book is drawn as
        // two SVG paths stacked in one icon: an outline (blue stroke, page
        // coloured to match the card) shown by default, and a solid blue
        // fill shown once the card has been opened (see the "book-icon
        // opened" class toggled by togglePhaseCard/markStudied in this
        // file). CSS decides which path is visible; this markup never changes.
        '<span class="phase-icon" aria-hidden="true">' +
          '<svg class="book-icon" viewBox="0 0 16 16" width="28" height="28" focusable="false">' +
            '<path class="book-icon-outline" d="M1 2.828c.885-.37 2.154-.769 3.388-.893 1.33-.134 2.458.063 3.112.752v9.746c-.935-.53-2.12-.603-3.213-.493-1.18.12-2.37.461-3.287.811V2.828zm7.5-.141c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.923c-.918-.35-2.107-.692-3.287-.81-1.094-.111-2.278-.039-3.213.492V2.687zM8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.409-.142 2.59.087 3.223.877a.5.5 0 0 0 .78 0c.633-.79 1.814-1.019 3.222-.877 1.378.139 2.8.62 3.681 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.809 8.985.936 8 1.783z"></path>' +
            '<path class="book-icon-filled" d="M8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.271-.128 2.35.056 3.02.502V1.783Zm1 12.653v.001c.67-.446 1.749-.63 3.02-.502 1.376.139 2.797.62 3.68 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.809 8.985.936 8 1.783v12.653Z"></path>' +
          '</svg>' +
        '</span>' +
        '<div class="phase-meta">' +
          '<span class="phase-clause">' + phase.clause + '</span>' +
          '<div class="phase-title">' + phase.title + '</div>' +
          '<div class="phase-summary">' + phase.summary + '</div>' +
          '<div class="phase-classes">' + classBadges + '</div>' +
        '</div>' +
        '<span class="partial-badge hidden" aria-live="polite"></span>' +
        '<span class="phase-chevron" aria-hidden="true">&#9660;</span>' +
      '</div>' +
      '<div class="phase-details" id="phase-details-' + phase.id + '">' +
        '<ul>' + detailItems + '</ul>' +
        buildSubClauseTable(phase) +
        buildExampleDocBlock(phase) +
      '</div>' +
      '<div class="phase-footer">' +
        // role="alert" makes this a live region: a screen reader announces
        // its content the moment markStudied() fills it in, the same
        // pattern #participant-name-error uses on the quiz page. Empty by
        // default, and .field-error reserves its line height even then, so
        // showing the message never shifts the button underneath it.
        '<span class="field-error" id="studied-error-' + phase.id + '" role="alert"></span>' +
        // Two buttons live in the same slot; CSS shows exactly one at a time,
        // keyed off .phase-card.opened (see togglePhaseCard). Before the card
        // has ever been expanded, "Mark as Studied" would be asking the
        // reader to certify content they have not seen yet — so the footer
        // offers "Read More" instead, which simply expands the card (same
        // action as clicking the header). Once opened, Read More disappears
        // and Mark as Studied takes its place. A real, visible, enabled
        // button is present in the footer at all times either way, so this
        // is a swap in meaning, not content hidden without explanation.
        '<button class="btn btn-secondary read-more-btn" data-id="' + phase.id + '" aria-controls="phase-details-' + phase.id + '">' +
          'Read More' +
        '</button>' +
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

// ============================================================
// DELIVERABLES LIST
//
// "What do I actually have to produce for Class B?" — answered by walking the
// sub-clause data and keeping the requirements that apply at the chosen class.
//
// Two deliberate limits, both about not overstating what the standard says:
//
//   1. No document names are invented. IEC 62304 states it "does not prescribe
//      the name, format, or explicit content of the documentation to be
//      produced". So this list is organised by REQUIREMENT, and the description
//      of what must be produced uses the standard's own wording (the `output`
//      field). "Software Requirements Specification" is a common and sensible
//      way to package §5.2, but it is a convention, not a requirement, and a
//      training tool should not blur that line.
//
//   2. Requirements with no documented output are still listed, marked as an
//      activity with no artefact named by the standard. Dropping them would
//      imply the requirement does not exist. Showing the gap is more honest and
//      more useful — those rows are exactly where a manufacturer has to decide
//      for itself what evidence it will keep.
// ============================================================

// Flattens the applicable requirements for one class into rows ready to render
// or export. Ordered by clause, following the standard's own sequence.
function deliverablesFor(cls) {
  const rows = [];

  phases.forEach(function (phase) {
    (phase.subClauses || []).forEach(function (sc) {
      // Skip sub-clauses removed by Amendment 1 — they carry no requirement.
      if (!Array.isArray(sc.classes) || sc.classes.length === 0) return;
      if (sc.classes.indexOf(cls) === -1) return;

      rows.push({
        clause: phase.clause,
        area: phase.title,
        ref: sc.ref,
        requirement: sc.title,
        output: sc.output || '',
        // The standard's own cross-reference to another standard, where it has
        // one. Only 4.1 and 4.2 carry this: both are satisfied outside 62304
        // (ISO 13485 or an equivalent QMS, and ISO 14971), so a bare "no
        // artefact named" would read as a gap when the requirement is in fact
        // met somewhere specific.
        seeAlso: sc.seeAlso || '',
        classes: sc.classes.join('/'),
        note: sc.note || ''
      });
    });
  });

  return rows;
}

function renderDeliverables(classFilter) {
  const panel = document.getElementById('deliverables');
  const heading = document.getElementById('deliverables-heading');
  const count = document.getElementById('deliverables-count');
  const body = document.getElementById('deliverables-body');
  if (!panel || !body) return;

  // The list is class-specific by definition, so it has no meaning with no class
  // selected. Hiding it is clearer than showing all 97 rows unlabelled.
  if (classFilter === 'all' || phases.length === 0) {
    panel.classList.add('hidden');
    body.innerHTML = '';
    return;
  }

  const rows = deliverablesFor(classFilter);
  const withOutput = rows.filter(function (r) { return r.output; });

  panel.classList.remove('hidden');
  heading.textContent = 'Deliverables for Class ' + classFilter;
  count.textContent = withOutput.length + ' documented outputs across ' +
                      rows.length + ' applicable requirements';

  // Group by clause so the list reads in the standard's order and a reader can
  // map it onto their own document structure.
  let html = '';
  let currentClause = null;

  rows.forEach(function (r) {
    if (r.clause !== currentClause) {
      if (currentClause !== null) html += '</tbody></table>';
      currentClause = r.clause;
      html += '<h3 class="dl-clause">' + r.clause + ' &mdash; ' + r.area + '</h3>' +
              '<table class="dl-table">' +
                '<thead><tr>' +
                  '<th scope="col">Ref</th>' +
                  '<th scope="col">Requirement</th>' +
                  '<th scope="col">What the standard requires you to produce</th>' +
                '</tr></thead><tbody>';
    }

    // A row with no output but a cross-reference is NOT the same as a row with
    // neither. 4.1 and 4.2 name no 62304 artefact because the requirement is
    // met in another standard, so they get the pointer instead of the
    // "decide for yourself" wording, which would be actively misleading here.
    let output;
    if (r.output) {
      output = r.output;
    } else if (r.seeAlso) {
      output = '<span class="dl-none">No artefact named by <em>this</em> standard &mdash; ' +
               'satisfied under the standard referenced below</span>';
    } else {
      output = '<span class="dl-none">No documented artefact named by the standard &mdash; ' +
               'an activity you must perform, and decide for yourself what evidence to keep</span>';
    }

    if (r.seeAlso) {
      output += '<p class="dl-seealso"><span class="dl-seealso-label">In IEC 62304 &sect;' +
                r.ref + ':</span> ' + r.seeAlso + '</p>';
    }

    html += '<tr' + (r.output ? '' : ' class="dl-row-activity"') + '>' +
              '<th scope="row" class="dl-ref">' + r.ref + '</th>' +
              '<td class="dl-req">' + r.requirement + '</td>' +
              '<td class="dl-out">' + output + '</td>' +
            '</tr>';
  });
  if (currentClause !== null) html += '</tbody></table>';

  html += '<p class="dl-footnote"><strong>How to read this.</strong> The list is ' +
          'organised by requirement, not by document. IEC 62304 does not prescribe ' +
          'document names, formats or how the content is packaged &mdash; that is left ' +
          'to you. Several requirements are commonly satisfied by one document, and ' +
          'one requirement can span several. Every row cites its sub-clause so you ' +
          'can trace it back to the standard.</p>';

  body.innerHTML = html;
}

// ---------- CSV EXPORT ----------
// Built entirely in the browser. There is no server to ask, so the file is
// assembled as a string, wrapped in a Blob, and handed to a temporary link which
// is clicked programmatically.
//
// Two details that are easy to get wrong and annoying to debug:
//
//   * ESCAPING. A field containing a comma, a double quote or a newline has to be
//     wrapped in double quotes, with any internal quote doubled. Skip this and a
//     single requirement description containing a comma silently shifts every
//     later column — the file still opens, it is just wrong.
//
//   * THE BOM. Excel assumes the ANSI codepage unless a CSV starts with a UTF-8
//     byte order mark, so the section signs and em dashes in this content would
//     arrive as mojibake. The three-byte ﻿ prefix fixes it, and is harmless
//     everywhere else.
function csvCell(value) {
  const s = String(value == null ? '' : value);
  if (/[",\r\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function deliverablesCsv(cls) {
  const header = ['Clause', 'Process area', 'Ref', 'Requirement',
                  'What the standard requires you to produce',
                  'Where the standard says this is satisfied',
                  'Applies to classes', 'Notes'];

  const lines = [header.map(csvCell).join(',')];

  deliverablesFor(cls).forEach(function (r) {
    lines.push([
      r.clause,
      r.area,
      r.ref,
      r.requirement,
      r.output || (r.seeAlso
        ? 'No artefact named by this standard - satisfied under the standard referenced in the next column'
        : 'No documented artefact named by the standard'),
      r.seeAlso,
      r.classes,
      r.note
    ].map(csvCell).join(','));
  });

  // CRLF is what the CSV convention specifies and what Excel expects.
  return lines.join('\r\n') + '\r\n';
}

function downloadDeliverables(cls) {
  const csv = '﻿' + deliverablesCsv(cls);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });

  // createObjectURL hands back a URL pointing at the in-memory Blob. It has to be
  // revoked afterwards or the Blob is held in memory for the life of the page.
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'iec62304-deliverables-class-' + cls.toLowerCase() + '.csv';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ---------- SUB-CLAUSE TABLE ----------
// Shows, requirement by requirement, which safety classes it applies to.
//
// This is the detail the old single-list-of-classes model could not express, and
// it is where the real lesson lives: applicability in IEC 62304 is assigned per
// requirement, not per clause. A card saying "Clause 5.4 — Class B and C" invites
// the reader to assume all of 5.4 applies at Class B, when only §5.4.1 does.
//
// A real <table> is used rather than styled divs because this is genuinely tabular
// data — requirements down the side, classes across the top. Screen readers can
// then announce "Class B, applies" for a cell instead of leaving the user to infer
// meaning from a tick's position.
function buildSubClauseTable(phase) {
  if (!phase.subClauses || phase.subClauses.length === 0) return '';

  let rows = '';
  phase.subClauses.forEach(function (sc) {
    const deleted = !Array.isArray(sc.classes) || sc.classes.length === 0;

    let cells = '';
    ['A', 'B', 'C'].forEach(function (cls) {
      if (deleted) {
        // aria-hidden on the dash, plus sr-only text, so a screen reader hears
        // words rather than punctuation it may or may not announce.
        cells += '<td class="sc-cell sc-void"><span aria-hidden="true">&mdash;</span>' +
                 '<span class="sr-only">not applicable</span></td>';
      } else if (sc.classes.indexOf(cls) !== -1) {
        cells += '<td class="sc-cell sc-yes"><span aria-hidden="true">&#10003;</span>' +
                 '<span class="sr-only">Class ' + cls + ': applies</span></td>';
      } else {
        cells += '<td class="sc-cell sc-no"><span aria-hidden="true">&middot;</span>' +
                 '<span class="sr-only">Class ' + cls + ': does not apply</span></td>';
      }
    });

    const noteHtml = sc.note
      ? ' <span class="sc-note">' + sc.note + '</span>'
      : '';

    rows += '<tr' + (deleted ? ' class="sc-row-void"' : '') + '>' +
              '<th scope="row" class="sc-ref">' + sc.ref + '</th>' +
              '<td class="sc-title">' + sc.title + noteHtml + '</td>' +
              cells +
            '</tr>';
  });

  return '' +
    '<div class="phase-subclauses">' +
      '<table class="sc-table">' +
        '<caption>Which safety classes each requirement of ' + phase.clause +
          ' applies to, per IEC&nbsp;62304 Table&nbsp;A.1 and the normative text.</caption>' +
        '<thead><tr>' +
          '<th scope="col">Ref</th>' +
          '<th scope="col">Requirement</th>' +
          '<th scope="col">A</th><th scope="col">B</th><th scope="col">C</th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table>' +
    '</div>';
}

// ============================================================
// EXAMPLE ARTEFACT LINKS
// Every process area maps to one worked-example document under docs/ — see
// docs/README.md for the full set and docs/render.py for how the preview
// pages are generated. Deliberately placed at the CARD level (this whole
// process area), not inside the per-sub-clause deliverables rows: those rows
// intentionally never invent a document name (see the comment above
// deliverablesFor()), and attaching one concrete example file to them would
// blur exactly the line that feature draws. A card already has a title for
// the whole process area, which is where a worked example belongs instead.
// ============================================================
function buildExampleDocBlock(phase) {
  // Guards against a phase with no exampleDoc, the same way
  // buildSubClauseTable() guards against a phase with no subClauses — even
  // though every entry in phases.json currently has one, a card should not
  // silently break if a future topic is added without it.
  if (!phase.exampleDoc) return '';

  // Preview/Download point at the DEVICE example set (docs/device-example/),
  // not the site's own self-referential set (docs/). The self-referential
  // set documents this training website's own development — real evidence,
  // but about a website, not a medical device — which was misleading here:
  // a reader clicking "Preview example document" on a clause card should see
  // what that clause's deliverable looks like for an actual device, not for
  // the site itself. The device set (SentinelFlow 500, a fictional infusion
  // pump — see docs/device-example/README.md) exists for exactly that. Both
  // sets are still real, readable documents; only the link target moved.
  const previewHref = 'docs/device-example/' + phase.exampleDoc + '.html';
  const downloadHref = 'docs/device-example/' + phase.exampleDoc + '.pdf';
  // The `download` attribute's VALUE is the filename the browser offers to
  // save as — it does not need to match the URL. Used here so the file a
  // learner actually gets is named for the document, not for its slug on
  // disk. See docs/render_pdf.py for why the download is a PDF at all: this
  // course is taken by people who work in Word, Excel, PowerPoint and PDF,
  // not GitHub or markdown, so the raw .md source this used to offer was not
  // a document to them.
  const downloadName = phase.title + ' (example).pdf';

  return '' +
    '<div class="example-doc">' +
      '<p class="example-doc-label">' +
        '<strong>Example artefact</strong> &mdash; a worked example of the SOP ' +
        'this process area would produce, for &ldquo;SentinelFlow 500&rdquo;, a ' +
        'fictional infusion pump invented for this course. Training example only ' +
        '&mdash; SentinelFlow 500 does not exist and this is not a genuine ' +
        'regulatory deliverable.' +
      '</p>' +
      '<div class="example-doc-actions">' +
        '<a class="btn btn-secondary example-doc-preview" href="' + previewHref + '"' +
          ' target="_blank" rel="noopener" data-id="' + phase.id + '"' +
          ' aria-label="Preview example document for ' + phase.title + '">' +
          'Preview example document</a>' +
        '<a class="btn btn-secondary example-doc-download" href="' + downloadHref + '"' +
          ' download="' + downloadName + '" data-id="' + phase.id + '"' +
          ' aria-label="Download example document for ' + phase.title + ' as PDF">' +
          'Download (PDF)</a>' +
      '</div>' +
      // A separate, deliberately lower-key line: this is an upsell to a real
      // St John Lynch & Co product, not part of the free preview/download
      // pair above, so it is neither styled as a third button nor wired into
      // previewedDocs (no data-id) — it must never gate Mark as Studied the
      // way Preview/Download do, since a learner who never buys a template
      // pack has still fully engaged with the free example.
      '<p class="example-doc-real-template">' +
        'Want the real, editable version this is modelled on? ' +
        '<a href="https://stjohnlynch.com/toolkit/" target="_blank" rel="noopener noreferrer">' +
          'Get St John Lynch &amp; Co&rsquo;s SOP template pack&nbsp;&#8599;' +
        '</a>' +
      '</p>' +
    '</div>';
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
  const docLink = e.target.closest('.example-doc-actions a');
  const studiedBtn = e.target.closest('.mark-studied-btn');
  const readMoreBtn = e.target.closest('.read-more-btn');
  const header = e.target.closest('.phase-header');

  // Preview and Download are real <a> tags with a real href — this handler
  // never calls preventDefault, so the browser still opens the tab or starts
  // the download on its own. All this does is RECORD that it happened, which
  // is what markStudied() checks before it allows the topic to be studied.
  if (docLink && docLink.dataset.id) {
    previewedDocs.add(docLink.dataset.id);
    saveIdSet(PREVIEWED_STORAGE_KEY, previewedDocs);
    const err = document.getElementById('studied-error-' + docLink.dataset.id);
    if (err) err.textContent = '';
    return;
  }

  if (studiedBtn) {
    markStudied(studiedBtn.dataset.id);
    return;
  }

  // Read More is only ever shown on a card that hasn't been opened yet (see
  // the CSS keyed off .phase-card.opened), so it can only ever expand —
  // never collapse — the card it belongs to.
  if (readMoreBtn && readMoreBtn.dataset.id) {
    togglePhaseCard(readMoreBtn.dataset.id);
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
    // 'opened' is one-way, unlike 'expanded': the book icon fills in blue the
    // first time a card is expanded and STAYS filled if the reader collapses
    // it again, so the icon works as a "you've been here" mark across the
    // whole grid rather than just a live open/closed indicator.
    if (card.classList.contains('expanded')) {
      card.classList.add('opened');
    }
  }
}

// ---------- DEEP LINK: RETURN TO A CARD FROM ITS URL HASH ----------
// Every example document links back with e.g. learn.html#phase-configuration,
// meant to return the reader to the card they came from. The browser's own
// "jump to this element" behaviour cannot do that here on its own: it fires
// once, immediately after the HTML is parsed, and at that instant the cards
// do not exist yet — they are built by renderPhases(), which only runs once
// data/phases.json has finished loading. By the time the card actually
// appears, the browser has already given up; it does not retry once the
// element shows up later. Without this, "Back to Learn" silently dropped the
// reader at the top of a 13-card page instead of at the card they came from.
// Called from initPhases() once loadPhases() (and therefore renderPhases())
// has actually finished, so the id below is guaranteed to exist if it is
// ever going to.
function openCardFromHash() {
  const match = /^#phase-(.+)$/.exec(window.location.hash);
  if (!match) return;

  const id = match[1];
  const card = document.getElementById('phase-' + id);
  if (!card) return; // hash named something that isn't a real card — ignore it

  if (!card.classList.contains('expanded')) {
    togglePhaseCard(id);
  }
  card.scrollIntoView({ block: 'start' });
}

// ---------- DEEP LINK: RESTORE "PREVIEWED" FROM THE URL ----------
// "Back to Learn" carries ?previewed=<id> as well as the #phase-<id> hash
// openCardFromHash() reads above. Belt and braces, now that previewedDocs is
// backed by localStorage (see the STORAGE comment near the top of this file):
// the normal case no longer strictly needs this, since every tab already
// shares the same localStorage bucket. This stays as a fallback for the case
// localStorage itself does not work — Safari private browsing historically,
// or a locked-down third-party-storage context — where saveIdSet() silently
// no-ops (see its own try/catch) and a fresh tab would otherwise have no way
// to know a document was ever opened. A URL parameter has no dependency on
// storage working at all: it is carried by the link itself.
//
// Must run — and finish updating previewedDocs — BEFORE renderPhases()
// builds the cards, because renderPhases() reads previewedDocs once, while
// building each card's initial HTML (see the "Restore the opened mark"
// comment there); it does not re-check afterwards. That is why this is
// called at the very top of DOMContentLoaded, not from initPhases() the way
// openCardFromHash() is — by the time loadPhases() has even started, this
// needs to already be done.
function restorePreviewedFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('previewed');
  if (!id) return;

  previewedDocs.add(id);
  saveIdSet(PREVIEWED_STORAGE_KEY, previewedDocs);

  // Drop the query string but keep the hash — openCardFromHash() still needs
  // it, and leaving ?previewed=... visible in the address bar would suggest
  // reloading or bookmarking this exact URL does something meaningful, when
  // its only job was to survive this one navigation.
  const cleanUrl = window.location.pathname + window.location.hash;
  window.history.replaceState(null, '', cleanUrl);
}

// ---------- MARK AS STUDIED ----------
//
// A topic can only be marked studied once its example document has been
// opened at least once — Preview or Download, either counts (see
// handleCardClick). This is enforced here rather than by disabling the
// button up front: the quiz's name field validates the same way, on the
// attempt rather than by pre-emptively disabling Begin Assessment, because a
// disabled control gives a screen reader user no way to discover why it is
// inert. Only enforced for phases that actually HAVE an example document —
// buildExampleDocBlock() already guards the same condition, so a future
// topic added without one is simply not gated.
function markStudied(id) {
  if (studiedPhases.has(id)) return;

  const card = document.getElementById('phase-' + id);
  if (!card) return;

  const errorEl = document.getElementById('studied-error-' + id);
  const hasExampleDoc = !!card.querySelector('.example-doc');

  if (hasExampleDoc && !previewedDocs.has(id)) {
    if (errorEl) {
      errorEl.textContent = 'Preview or download the example document above before marking this topic as studied.';
    }
    // The example document lives inside .phase-details, which is collapsed
    // (display: none) unless the card is expanded — clicking Mark as Studied
    // does not require the card to be open, so without this the reader would
    // see an error pointing at a link they cannot see. Expanding it and
    // moving focus to the Preview link turns the error into a next step
    // rather than a dead end.
    if (!card.classList.contains('expanded')) {
      card.classList.add('expanded', 'opened');
      const header = card.querySelector('.phase-header');
      if (header) header.setAttribute('aria-expanded', 'true');
    }
    const previewLink = card.querySelector('.example-doc-preview');
    if (previewLink) previewLink.focus();
    return;
  }

  if (errorEl) errorEl.textContent = '';

  studiedPhases.add(id);
  saveIdSet(STUDIED_STORAGE_KEY, studiedPhases);
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

    // applicabilityAt() rather than phase.classes, so the filter and the notice
    // both read from the same sub-clause data and cannot disagree with each other.
    const state = classFilter === 'all' ? 'full' : applicabilityAt(phase, classFilter);
    card.classList.toggle('hidden', state === 'none');

    // Mark cards that apply only in part, so the grid itself carries the nuance
    // and not just the notice above it.
    card.classList.toggle('partial-applicability', state === 'partial');
    const badge = card.querySelector('.partial-badge');
    if (badge) {
      badge.classList.toggle('hidden', state !== 'partial');
      badge.textContent = 'Applies in part at Class ' + classFilter;
    }

    // Grey out the sub-clause rows that carry no requirement at the active class,
    // so an expanded card answers "which parts of this apply to me?" directly.
    card.querySelectorAll('.sc-table tbody tr').forEach(function (row, i) {
      const sc = phase.subClauses[i];
      if (!sc) return;
      const off = classFilter !== 'all' &&
                  Array.isArray(sc.classes) &&
                  sc.classes.length > 0 &&
                  sc.classes.indexOf(classFilter) === -1;
      row.classList.toggle('sc-row-filtered', off);
    });
  });

  updateFilterNotice(classFilter);
  renderDeliverables(classFilter);
}

// ---------- FILTER NOTICE ----------
// Explains what the filter did, and carries the regulatory caution that goes
// with it. Two problems this solves:
//
// 1. Hiding cards further down a long page is invisible feedback. A user who
//    clicked "Class A" had no way of knowing whether anything happened, how
//    many topics were removed, or which ones.
//
// 2. More seriously, silently hiding Clause 7 (Software Risk Management) from a
//    Class A view invites exactly the wrong conclusion — that Class A software
//    needs no risk management. It is the reverse: you cannot arrive at Class A
//    WITHOUT a risk analysis establishing that the software item cannot
//    contribute to a hazardous situation. The classification is an output of
//    ISO 14971 work, not a shortcut around it.
//
// The omitted list is derived from the same data that drives the filtering, so
// it cannot fall out of step with what is actually on screen.
function updateFilterNotice(classFilter) {
  const notice = document.getElementById('filter-notice');
  const label = document.getElementById('filter-notice-label');
  const body = document.getElementById('filter-notice-body');
  if (!notice || !label || !body) return;

  // No filter, or no data yet — nothing meaningful to report.
  if (classFilter === 'all' || phases.length === 0) {
    notice.classList.add('hidden');
    label.textContent = '';
    body.innerHTML = '';
    return;
  }

  // Three buckets, from the sub-clause data. The middle one is the whole reason
  // this feature was rebuilt: previously a clause either appeared or vanished, so
  // "Clause 7 applies to Class A" and "one requirement of Clause 7 applies to
  // Class A" looked identical, and the difference is exactly what a learner needs.
  const full = phases.filter(function (p) { return applicabilityAt(p, classFilter) === 'full'; });
  const partial = phases.filter(function (p) { return applicabilityAt(p, classFilter) === 'partial'; });
  const omitted = phases.filter(function (p) { return applicabilityAt(p, classFilter) === 'none'; });
  const shown = full.concat(partial);

  // Reveal the panel BEFORE writing the text. A live region that is
  // display:none when its content changes is unreliably announced; changing the
  // text while it is already visible is what prompts the announcement.
  notice.classList.remove('hidden');
  label.textContent = 'Filtered to Class ' + classFilter;

  let html = '';

  // ---- Headline count ----
  if (omitted.length === 0 && partial.length === 0) {
    html += '<p class="filter-notice-count">All <strong>' + phases.length +
            '</strong> process areas apply to Class ' + classFilter +
            ' software in full. Class C carries the complete set of IEC 62304 requirements — ' +
            'nothing is omitted and nothing is reduced.</p>';
  } else {
    html += '<p class="filter-notice-count">Showing <strong>' + shown.length + ' of ' +
            phases.length + '</strong> process areas for Class ' + classFilter + ' software';
    if (partial.length > 0) {
      html += ', of which <strong>' + partial.length + '</strong> ' +
              (partial.length === 1 ? 'applies' : 'apply') + ' only in part';
    }
    html += '.</p>';
  }

  // ---- Applies, but only in part ----
  // Naming the specific sub-clauses is the difference between a filter and a
  // teaching tool. "Clause 7 applies to Class A" is true and nearly useless;
  // "of Clause 7, only 7.4.1 applies at Class A" is the actual answer.
  if (partial.length > 0) {
    html += '<p class="filter-notice-subheading">Applies in part &mdash; only some requirements ' +
            'of these areas are assigned to Class ' + classFilter + ':</p>';
    html += '<ul class="filter-notice-list">';
    partial.forEach(function (p) {
      const live = p.subClauses.filter(function (sc) { return sc.classes.length > 0; });
      const applying = live.filter(function (sc) { return sc.classes.indexOf(classFilter) !== -1; });
      html += '<li><strong>' + p.clause + '</strong> &mdash; ' + p.title +
              ' <span class="filter-notice-applies">(' + applying.length + ' of ' + live.length +
              ' requirements: ' + applying.map(function (sc) { return sc.ref; }).join(', ') +
              ')</span></li>';
    });
    html += '</ul>';
  }

  // ---- Does not apply at all ----
  if (omitted.length > 0) {
    html += '<p class="filter-notice-subheading">Hidden &mdash; IEC 62304 assigns no requirement ' +
            'in these areas to Class ' + classFilter + ':</p>';
    html += '<ul class="filter-notice-list">';
    omitted.forEach(function (p) {
      html += '<li><strong>' + p.clause + '</strong> &mdash; ' + p.title +
              ' <span class="filter-notice-applies">(required for Class ' +
              p.classes.join(' and ') + ')</span></li>';
    });
    html += '</ul>';
  }

  // ---- THE CAUTION ----
  // Shown for every class, including C, because the classification has to stay
  // valid for the life of the product, not just at the moment it was assigned.
  html += '<div class="filter-notice-caution">';
  html += '<strong class="filter-notice-caution-heading">&#9888;&#xFE0E; Confirm your classification still holds</strong>';

  // Triggered by the CLASS, not by which areas happen to be hidden.
  //
  // This paragraph originally fired when Clause 7 appeared in the omitted list.
  // That was fragile as well as wrong-headed: correcting Clause 7 to apply to
  // all classes removed it from the omitted list, which would have silently
  // switched off the very warning that matters most. Tying it to Class A means
  // it cannot disappear as a side effect of a data change.
  if (classFilter === 'A') {
    html += '<p><strong>Class A does not mean risk management is out of scope.</strong> ' +
            'The safety classification is an <em>output</em> of your ISO&nbsp;14971 risk analysis, not an ' +
            'alternative to it. Under &#167;4.3, Class A may only be assigned where the risk management ' +
            'process has established that the software item <em>cannot</em> contribute to a hazardous ' +
            'situation. &#167;4.2 requires an ISO&nbsp;14971 risk management process for every class, and ' +
            'within Clause&nbsp;7 itself &#167;7.4.1 &mdash; analyse changes to the software with respect ' +
            'to safety &mdash; applies to Class&nbsp;A as well as B and C.</p>';
  }

  html += '<p>Re-check and re-validate your ISO&nbsp;14971 risk management file whenever the intended use, ' +
          'requirements, architecture, risk controls or SOUP components change. ';

  // Only refer to "the processes above" when some were actually listed —
  // at Class C nothing is omitted, so that phrase would point at nothing.
  if (omitted.length > 0) {
    html += 'If the analysis shows a software item could contribute to a hazardous situation, the safety ' +
            'class rises and the ' + (omitted.length === 1 ? 'process' : 'processes') +
            ' listed above ' + (omitted.length === 1 ? 'becomes' : 'become') + ' applicable. ';
  } else {
    html += 'Class C is already the most demanding classification, so no further process areas can be ' +
            'added — but the analysis must still show that the classification remains correct, and that ' +
            'every risk control implemented in software is still effective. ';
  }

  html += 'Classification is not a one-off decision &mdash; it is a conclusion that must remain justified ' +
          'throughout the lifecycle, and re-checking it is a Clause&nbsp;6 maintenance obligation after ' +
          'any change to released software.</p>';
  html += '</div>';

  body.innerHTML = html;
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

  // Must run before renderPhases() — see the comment on
  // restorePreviewedFromUrl() itself for why.
  restorePreviewedFromUrl();

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

  // DELIVERABLES PANEL — show/hide and CSV export.
  // The panel starts collapsed because the list runs to 40-71 rows depending on
  // class, and most visitors are browsing rather than compiling a document set.
  const dlToggle = document.getElementById('deliverables-toggle');
  const dlBody = document.getElementById('deliverables-body');
  if (dlToggle && dlBody) {
    dlToggle.addEventListener('click', function () {
      const open = dlBody.classList.toggle('hidden') === false;
      // aria-expanded must track the visual state or a screen reader user is told
      // the opposite of what is on screen.
      dlToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      dlToggle.textContent = open ? 'Hide list' : 'Show list';
    });
  }

  const dlDownload = document.getElementById('deliverables-download');
  if (dlDownload) {
    dlDownload.addEventListener('click', function () {
      if (activeFilter === 'all') return; // panel is hidden in this state anyway
      downloadDeliverables(activeFilter);
    });
  }

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
