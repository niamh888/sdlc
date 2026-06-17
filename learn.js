var phases = [
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

var studiedPhases = new Set();
var activeFilter = 'all';

function renderPhases() {
  var grid = document.getElementById('phases-grid');
  grid.innerHTML = '';

  phases.forEach(function (phase) {
    var card = document.createElement('div');
    card.className = 'phase-card';
    card.id = 'phase-' + phase.id;

    if (studiedPhases.has(phase.id)) {
      card.classList.add('studied');
    }

    var classBadges = phase.classes
      .map(function (c) { return '<span class="class-badge ' + c + '">Class ' + c + '</span>'; })
      .join('');

    var detailItems = phase.details
      .map(function (d) { return '<li>' + d + '</li>'; })
      .join('');

    var isStudied = studiedPhases.has(phase.id);

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

    grid.appendChild(card);
  });

  document.getElementById('progress-total').textContent = phases.length;
  applyFilter(activeFilter);
  updateProgress();

  grid.addEventListener('click', handleCardClick);
}

function handleCardClick(e) {
  var studiedBtn = e.target.closest('.mark-studied-btn');
  var header = e.target.closest('.phase-header');

  if (studiedBtn) {
    markStudied(studiedBtn.dataset.id);
    return;
  }

  if (header) {
    togglePhaseCard(header.dataset.id);
  }
}

function togglePhaseCard(id) {
  var card = document.getElementById('phase-' + id);
  if (card) {
    card.classList.toggle('expanded');
  }
}

function markStudied(id) {
  if (studiedPhases.has(id)) return;

  studiedPhases.add(id);

  var card = document.getElementById('phase-' + id);
  if (!card) return;

  card.classList.add('studied');

  var btn = card.querySelector('.mark-studied-btn');
  if (btn) {
    btn.textContent = '✓ Studied';
    btn.disabled = true;
  }

  updateProgress();
}

function applyFilter(classFilter) {
  activeFilter = classFilter;

  document.querySelectorAll('.filter-btn').forEach(function (btn) {
    btn.classList.toggle('active', btn.dataset.filter === classFilter);
  });

  phases.forEach(function (phase) {
    var card = document.getElementById('phase-' + phase.id);
    if (!card) return;
    var visible = classFilter === 'all' || phase.classes.indexOf(classFilter) !== -1;
    card.classList.toggle('hidden', !visible);
  });
}

function updateProgress() {
  var count = studiedPhases.size;
  var total = phases.length;
  var pct = total > 0 ? (count / total) * 100 : 0;

  document.getElementById('progress-count').textContent = count;
  document.getElementById('progress-bar').style.width = pct + '%';

  var container = document.querySelector('.progress-bar-container');
  if (container) {
    container.setAttribute('aria-valuenow', Math.round(pct));
  }
}

document.addEventListener('DOMContentLoaded', function () {
  renderPhases();

  document.querySelectorAll('.filter-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      applyFilter(btn.dataset.filter);
    });
  });
});
