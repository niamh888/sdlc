// ============================================================
// learn.js  —  Learn page: phase cards, filter, progress tracker
// ============================================================

// ---------- DATA ----------
// An array of objects — one object per IEC 62304 process area.
// Storing content in a data structure (rather than hardcoding HTML)
// means the DOM is built programmatically. Add a new phase here
// and the card appears automatically — no HTML changes needed.

const phases = [
  {
    id: 'planning',
    clause: 'Clause 5.1',
    title: 'Software Development Planning',
    icon: '📋',
    summary: 'Define the software development plan covering lifecycle model, deliverables, traceability, and tools.',
    details: [
      'Establish the software development lifecycle model',
      'Identify all deliverables and development activities',
      'Plan software integration, testing, and release activities',
      'Define coding standards and development tools to be used',
      'Required for all safety classes: A, B, and C'
    ],
    classes: ['A', 'B', 'C']
  },
  {
    id: 'requirements',
    clause: 'Clause 5.2',
    title: 'Software Requirements Analysis',
    icon: '📝',
    summary: 'Define and document software requirements derived from the system specification.',
    details: [
      'Specify all functional and non-functional requirements',
      'Define software interface requirements',
      'Document performance, memory, and timing requirements',
      'Identify security and safety-related requirements',
      'Establish traceability from software requirements to system requirements'
    ],
    classes: ['A', 'B', 'C']
  },
  {
    id: 'architecture',
    clause: 'Clause 5.3',
    title: 'Software Architectural Design',
    icon: '🏗️',
    summary: 'Partition software into software items and define interfaces between them.',
    details: [
      'Decompose software into identifiable software items',
      'Define and document interfaces between software items',
      'Verify that the architecture implements all requirements',
      'Identify and document SOUP (Software of Unknown Provenance)',
      'Required for Class B and C; Class A has reduced documentation requirements'
    ],
    classes: ['A', 'B', 'C']
  },
  {
    id: 'detailed-design',
    clause: 'Clause 5.4',
    title: 'Software Detailed Design',
    icon: '🔧',
    summary: 'Refine the architecture into software units that can be implemented and tested independently.',
    details: [
      'Design each software unit in sufficient detail for implementation',
      'Define precise interfaces between software units',
      'Ensure the detailed design correctly implements the architectural design',
      'Document design decisions and their rationale',
      'Required only for Class C software'
    ],
    classes: ['C']
  },
  {
    id: 'implementation',
    clause: 'Clause 5.5',
    title: 'Unit Implementation and Verification',
    icon: '💻',
    summary: 'Implement each software unit and verify it meets its design specification.',
    details: [
      'Implement each software unit to its specification',
      'Establish acceptance criteria for unit verification',
      'Perform unit verification by review or test',
      'Document unit test plans and results',
      'Class C requires additional rigor and evidence of unit testing'
    ],
    classes: ['A', 'B', 'C']
  },
  {
    id: 'integration',
    clause: 'Clause 5.6',
    title: 'Software Integration and Testing',
    icon: '🔗',
    summary: 'Integrate software items in a planned sequence and verify the integrated result.',
    details: [
      'Plan and document the integration sequence',
      'Test interfaces between integrated software items',
      'Verify each integration step against the architectural design',
      'Perform regression testing after each integration step',
      'Integration test plans and results required for Class B and C'
    ],
    classes: ['B', 'C']
  },
  {
    id: 'system-testing',
    clause: 'Clause 5.7',
    title: 'Software System Testing',
    icon: '✅',
    summary: 'Test the complete software system against all documented software requirements.',
    details: [
      'Test all software requirements from the requirements specification',
      'Execute regression tests after any software changes',
      'Document test cases, expected results, and actual results',
      'Record and evaluate all anomalies found during testing',
      'Maintain traceability from test cases back to requirements'
    ],
    classes: ['A', 'B', 'C']
  },
  {
    id: 'release',
    clause: 'Clause 5.8',
    title: 'Software Release',
    icon: '🚀',
    summary: 'Confirm all development activities are complete and the software is ready for release.',
    details: [
      'Verify all planned development activities have been completed',
      'Evaluate and document all known anomalies',
      'Assign and document the software version identifier',
      'Archive the released software version and all associated records',
      'Create release notes summarising the software version'
    ],
    classes: ['A', 'B', 'C']
  },
  {
    id: 'maintenance',
    clause: 'Clause 6',
    title: 'Software Maintenance Process',
    icon: '🔄',
    summary: 'Plan and control modifications to released software throughout the product lifecycle.',
    details: [
      'Establish a feedback and problem monitoring process for released software',
      'Analyse all change requests for safety impact before implementing',
      'Apply the appropriate development process activities to changes',
      'Re-evaluate the software safety classification if scope changes',
      'Maintain records of all problems and their resolutions'
    ],
    classes: ['A', 'B', 'C']
  },
  {
    id: 'risk-management',
    clause: 'Clause 7',
    title: 'Software Risk Management',
    icon: '⚠️',
    summary: 'Identify, evaluate, and control software contributions to device hazards, integrating with ISO 14971.',
    details: [
      'Identify software items that could contribute to hazardous situations',
      'Evaluate the effectiveness of software risk control measures',
      'Implement and verify software risk control measures',
      'Integrate software risk activities with the ISO 14971 device risk management process',
      'Document the relationship between software failures and device-level risks'
    ],
    classes: ['B', 'C']
  },
  {
    id: 'configuration',
    clause: 'Clause 8',
    title: 'Software Configuration Management',
    icon: '📦',
    summary: 'Identify, control, and track all software configuration items throughout the lifecycle.',
    details: [
      'Identify all software items that require configuration control',
      'Establish a configuration management system and process',
      'Control changes to software items through formal change control',
      'Track and report the status of all configuration items',
      'Include SOUP items in the configuration management system'
    ],
    classes: ['A', 'B', 'C']
  },
  {
    id: 'problem-resolution',
    clause: 'Clause 9',
    title: 'Problem Resolution Process',
    icon: '🛠️',
    summary: 'Systematically analyse, resolve, and document problems encountered during development and maintenance.',
    details: [
      'Establish a problem reporting and tracking system',
      'Analyse each problem for potential safety impact',
      'Investigate the root causes of significant problems',
      'Document the resolution and verify the fix is effective',
      'Evaluate problems for possible regulatory reporting obligations'
    ],
    classes: ['A', 'B', 'C']
  }
];

// ---------- STATE ----------
// A Set is like an array but guarantees uniqueness — perfect for tracking
// which phase IDs the user has marked as studied (no duplicates possible).
const studiedPhases = new Set();

// Tracks the currently active filter so applyFilter() always knows
// which button to highlight when the grid re-renders.
let activeFilter = 'all';

// ---------- RENDER ----------
// Builds all 12 phase cards from the phases array and inserts them
// into the #phases-grid div. Called once on page load.
function renderPhases() {
  const grid = document.getElementById('phases-grid');
  grid.innerHTML = '';

  // forEach iterates over the array. `phase` is the current object.
  phases.forEach(function (phase) {

    // createElement creates a DOM element in memory — not yet on the page.
    const card = document.createElement('div');
    card.className = 'phase-card';
    card.id = 'phase-' + phase.id;

    if (studiedPhases.has(phase.id)) {
      card.classList.add('studied');
    }

    // map transforms each class letter into an HTML badge string,
    // then join combines the array into one string.
    const classBadges = phase.classes
      .map(function (c) { return '<span class="class-badge ' + c + '">Class ' + c + '</span>'; })
      .join('');

    const detailItems = phase.details
      .map(function (d) { return '<li>' + d + '</li>'; })
      .join('');

    const isStudied = studiedPhases.has(phase.id);

    // innerHTML sets the card's content all at once from a template string.
    card.innerHTML =
      '<div class="phase-header" data-id="' + phase.id + '">' +
        '<span class="phase-icon">' + phase.icon + '</span>' +
        '<div class="phase-meta">' +
          '<span class="phase-clause">' + phase.clause + '</span>' +
          '<div class="phase-title">' + phase.title + '</div>' +
          '<div class="phase-summary">' + phase.summary + '</div>' +
          '<div class="phase-classes">' + classBadges + '</div>' +
        '</div>' +
        '<span class="phase-chevron">▼</span>' +
      '</div>' +
      '<div class="phase-details"><ul>' + detailItems + '</ul></div>' +
      '<div class="phase-footer">' +
        '<span class="studied-badge">✓ Studied</span>' +
        '<button class="btn btn-secondary mark-studied-btn" data-id="' + phase.id + '"' + (isStudied ? ' disabled' : '') + '>' +
          (isStudied ? '✓ Studied' : 'Mark as Studied') +
        '</button>' +
      '</div>';

    // appendChild adds the finished card into the live DOM.
    grid.appendChild(card);
  });

  document.getElementById('progress-total').textContent = phases.length;
  applyFilter(activeFilter);
  updateProgress();

  // EVENT DELEGATION — one listener on the grid handles clicks for ALL cards.
  // The alternative would be attaching a separate listener to each of the 12
  // cards. Delegation is more efficient and works even for cards added later.
  grid.addEventListener('click', handleCardClick);
}

// ---------- CLICK HANDLER (event delegation) ----------
// e.target is the exact element the user clicked. closest() walks UP the DOM
// tree from that element looking for the first ancestor matching the selector.
// This lets us identify which "zone" of the card was clicked.
function handleCardClick(e) {
  const studiedBtn = e.target.closest('.mark-studied-btn');
  const header = e.target.closest('.phase-header');

  if (studiedBtn) {
    // data-id is set on the button in the HTML template above.
    // dataset.id reads it as a JavaScript property.
    markStudied(studiedBtn.dataset.id);
    return; // early return stops the header toggle from also firing
  }

  if (header) {
    togglePhaseCard(header.dataset.id);
  }
}

// ---------- TOGGLE EXPAND / COLLAPSE ----------
function togglePhaseCard(id) {
  const card = document.getElementById('phase-' + id);
  if (card) {
    // classList.toggle adds the class if absent, removes it if present.
    // CSS hides/shows .phase-details based on whether .expanded is present.
    card.classList.toggle('expanded');
  }
}

// ---------- MARK AS STUDIED ----------
function markStudied(id) {
  // Guard: if already studied, do nothing.
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
// Shows only cards that apply to the selected safety class.
// Class C software must comply with all 12 process areas.
// Class A only needs the subset marked classes: ['A', ...].
function applyFilter(classFilter) {
  activeFilter = classFilter;

  // Highlight the active filter button.
  document.querySelectorAll('.filter-btn').forEach(function (btn) {
    // toggle with a boolean: adds 'active' if condition is true, removes if false.
    btn.classList.toggle('active', btn.dataset.filter === classFilter);
  });

  phases.forEach(function (phase) {
    const card = document.getElementById('phase-' + phase.id);
    if (!card) return;

    // indexOf returns -1 if the value is not in the array.
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

  // style.width sets an inline CSS property on the element directly.
  document.getElementById('progress-bar').style.width = pct + '%';

  // Keep the ARIA attribute in sync for screen readers.
  const container = document.querySelector('.progress-bar-container');
  if (container) {
    container.setAttribute('aria-valuenow', Math.round(pct));
  }
}

// ---------- INIT ----------
// DOMContentLoaded fires when the HTML is fully parsed but before images load.
// Wrapping all setup here ensures getElementById etc. find their targets.
document.addEventListener('DOMContentLoaded', function () {
  renderPhases();

  document.querySelectorAll('.filter-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      applyFilter(btn.dataset.filter);
    });
  });
});
