// ============================================================
// learn.js  —  Learn page: phase cards, filter, level toggle, progress tracker
// ============================================================

// ---------- DATA ----------
// Each phase has introDetails (overview-level bullets) and advancedDetails
// (clause-referenced, standards-accurate bullets). The active level is
// tracked in `activeLevel` and controls which array is rendered.

const phases = [
  {
    id: 'general-requirements',
    clause: 'Clause 4',
    title: 'General Requirements',
    icon: '⚙️',
    summary: 'Establish the QMS context, risk management integration, software safety classification, and SOUP framework that underpins all lifecycle activities.',
    introDetails: [
      'Your software lifecycle must operate within an ISO 13485 quality management system (QMS)',
      'Classify each software item as Class A, B, or C based on the worst-case harm if it fails',
      'Class A: no injury or damage to health possible; Class B: non-serious injury; Class C: death or serious injury possible',
      'SOUP (Software of Unknown Provenance) is any third-party or pre-existing software component — it must be identified and controlled throughout the lifecycle',
      'Amendment 1 (2015) added Legacy Software provisions: software already deployed before IEC 62304 was applied can still be brought into compliance without full retrospective documentation'
    ],
    advancedDetails: [
      '§4.1 QMS: All software lifecycle processes must be within, or consistent with, the manufacturer’s ISO 13485 QMS — procedures, records, training, and audit scope must all encompass software development activities',
      '§4.2 Risk Management: Software risk activities must be an integral part of the ISO 14971 device risk management process — not a parallel track; the software risk management file feeds directly into the device-level risk management file',
      '§4.3 Safety Classification (original): Class A = no injury or damage to health possible; Class B = non-serious injury possible; Class C = death or serious injury possible. Classification is based on worst-case severity after considering all non-software risk controls at device level',
      '§4.3 Safety Classification (Amendment 1 update): Refined to focus on hazardous situations. A software item that could contribute to a hazardous situation must be Class B minimum; if it is the sole control measure preventing serious injury or death, it must be Class C. Software items that cannot contribute to any hazardous situation may be Class A',
      '§4.4 Legacy Software (Amendment 1 addition): Software already deployed and in use before IEC 62304 was applied may be brought into compliance by documenting its development history, evaluating it against the standard’s requirements, and addressing identified gaps — full retrospective development documentation is not required'
    ],
    classes: ['A', 'B', 'C']
  },
  {
    id: 'planning',
    clause: 'Clause 5.1',
    title: 'Software Development Planning',
    icon: '📋',
    summary: 'Define the software development plan covering lifecycle model, deliverables, traceability, and tools.',
    introDetails: [
      'Establish the software development lifecycle model',
      'Identify all deliverables and development activities',
      'Plan software integration, testing, and release activities',
      'Define coding standards and development tools to be used',
      'Required for all safety classes: A, B, and C'
    ],
    advancedDetails: [
      'The Software Development Plan (SDP) must address: lifecycle model selection, all required activities and deliverables for the applicable safety class, standards and methods to be used, configuration management approach, problem resolution process, and how risk management integrates with development',
      'Amendment 1 added explicit cybersecurity planning requirements — the plan must describe how security requirements are identified, allocated to software items, implemented, and verified throughout the lifecycle',
      'The SDP must be consistent with the overall device development plan; software planning milestones (e.g., timing of risk analysis) must align with device-level development milestones',
      'For Class C, the plan must additionally address how detailed design activities are managed, documented, reviewed, and traced back to the architectural design',
      'The SDP is a living document — it must be updated whenever the scope, schedule, approach, or tool set changes materially; the change history of the plan is itself a quality record',
      'Integration and system test plans may exist as separate documents, but they must be referenced by and remain consistent with the SDP throughout development'
    ],
    classes: ['A', 'B', 'C']
  },
  {
    id: 'requirements',
    clause: 'Clause 5.2',
    title: 'Software Requirements Analysis',
    icon: '📝',
    summary: 'Define and document software requirements derived from the system specification.',
    introDetails: [
      'Specify all functional and non-functional requirements',
      'Define software interface requirements',
      'Document performance, memory, and timing requirements',
      'Identify security and safety-related requirements',
      'Establish traceability from software requirements to system requirements'
    ],
    advancedDetails: [
      'Requirements must be unambiguous, testable, and traceable to the system or device requirements specification — each software requirement must be verifiable by test, inspection, analysis, or demonstration',
      'Functional requirements: what the software shall do. Non-functional: performance thresholds, memory limits, reliability targets, usability standards. Interface requirements: hardware, software, and communication interfaces with full protocol specifications',
      'For each SOUP item, document the functional and performance requirements that the SOUP must fulfil, plus the hardware and software environment required for it to operate correctly (this feeds directly into §5.3 architectural design)',
      'Amendment 1 reinforced cybersecurity requirements — security-related requirements (input validation, authentication, data integrity, audit logging) must be explicitly captured alongside safety requirements in the requirements specification',
      'All requirements must be reviewed for completeness, consistency, correctness, and testability before design begins; a formal requirements review record is expected objective evidence for regulatory audits',
      'A bidirectional traceability matrix must be maintained: from system requirements down to software requirements, and upward so any software requirement can be traced back to its device-level source'
    ],
    classes: ['A', 'B', 'C']
  },
  {
    id: 'architecture',
    clause: 'Clause 5.3',
    title: 'Software Architectural Design',
    icon: '🏗️',
    summary: 'Partition software into software items and define interfaces between them.',
    introDetails: [
      'Decompose software into identifiable software items',
      'Define and document interfaces between software items',
      'Verify that the architecture implements all requirements',
      'Identify and document SOUP (Software of Unknown Provenance)',
      'Required for Class B and C; Class A has reduced documentation requirements'
    ],
    advancedDetails: [
      'The architectural design must decompose the software system into software items at a level sufficient to assign safety class, allocate requirements, and plan integration testing; each item must be uniquely identified',
      'All SOUP must be listed in the architecture with: name, manufacturer, version/revision identifier, intended use within the system, the functional and performance requirements it must meet, and the hardware/software environment it requires',
      'For Class B and C, the architecture must show how safety-related software items are segregated or protected — e.g., separation of safety-critical functions, use of watchdog timers, partitioned memory spaces, or access controls',
      'Interface specifications between software items must include: data types, value ranges, error conditions, timing constraints, and the protocol or API used — vague interface descriptions are a common critical finding in notified body audits',
      'Architectural design verification is required (typically a formal design review) — the review must confirm that all software requirements are allocated to one or more software items and that the architecture is internally consistent',
      'Traceability from software requirements to architectural design elements must be established and maintained; this bidirectional trace is inspected during regulatory submissions and audits'
    ],
    classes: ['A', 'B', 'C']
  },
  {
    id: 'detailed-design',
    clause: 'Clause 5.4',
    title: 'Software Detailed Design',
    icon: '🔧',
    summary: 'Refine the architecture into software units that can be implemented and tested independently.',
    introDetails: [
      'Design each software unit in sufficient detail for implementation',
      'Define precise interfaces between software units',
      'Ensure the detailed design correctly implements the architectural design',
      'Document design decisions and their rationale',
      'Required only for Class C software'
    ],
    advancedDetails: [
      'Required for Class C only — the detailed design must specify software units at a level where a qualified engineer can implement them without making design decisions, only coding decisions',
      'Detailed design must include: algorithms, data structures, state machines, error handling logic, and the precise API or calling convention for each unit’s interface — pseudocode, UML, or structured text are all acceptable formats',
      'All Class C software units must have documented acceptance criteria defined before implementation begins; these criteria directly drive unit verification activities in §5.5',
      'A detailed design review is required; the review must check that the design correctly implements the architectural design and that all design decisions are traceable to requirements or have documented rationale',
      'Traceability must extend downward: from architectural design elements to software units in the detailed design; this completes the bidirectional trace from system requirements all the way to individual code units',
      'Any design decision that deviates from a requirement, or that adds undocumented behaviour, must be raised as a problem report under the Clause 9 problem resolution process rather than resolved informally'
    ],
    classes: ['C']
  },
  {
    id: 'implementation',
    clause: 'Clause 5.5',
    title: 'Unit Implementation and Verification',
    icon: '💻',
    summary: 'Implement each software unit and verify it meets its design specification.',
    introDetails: [
      'Implement each software unit to its specification',
      'Establish acceptance criteria for unit verification',
      'Perform unit verification by review or test',
      'Document unit test plans and results',
      'Class C requires additional rigor and evidence of unit testing'
    ],
    advancedDetails: [
      'Acceptable unit verification methods include: code review, static analysis, unit testing, or a combination — the method chosen must be appropriate for the safety class and complexity of the unit being verified',
      'For Class C, acceptance criteria must be established before implementation (not after), and unit testing must be performed; test execution evidence must be retained as objective evidence for regulatory review',
      'Coding standards must be defined, documented, and enforced — the standard should address naming conventions, error handling, banned constructs, and memory management as appropriate for the language and target platform',
      'Class C unit testing should cover: nominal paths, boundary values, error and exception paths, and invalid inputs; test coverage metrics (statement, branch, or MCDC) may be required depending on risk and safety class',
      'Any anomalies found during unit verification must be documented and managed through the Clause 9 problem resolution process — silent fixes re-verified without a problem record are a regulatory finding',
      'Static analysis tools (e.g., lint, MISRA checkers) can supplement but not replace review or testing for Class C — their use, configuration, and any rule deviations must be documented in the software development plan'
    ],
    classes: ['A', 'B', 'C']
  },
  {
    id: 'integration',
    clause: 'Clause 5.6',
    title: 'Software Integration and Testing',
    icon: '🔗',
    summary: 'Integrate software items in a planned sequence and verify the integrated result.',
    introDetails: [
      'Plan and document the integration sequence',
      'Test interfaces between integrated software items',
      'Verify each integration step against the architectural design',
      'Perform regression testing after each integration step',
      'Integration test plans and results required for Class B and C'
    ],
    advancedDetails: [
      'Required for Class B and C — the integration sequence must be planned and documented before integration begins; incremental (not big-bang) integration is strongly implied by the requirement to test at each step',
      'Integration tests must verify the functional behaviour of each interface as it is integrated — confirming that code “runs without crashing” is insufficient; each interface must be tested against its specification',
      'Test cases must be traceable to the architectural design; the intent is to confirm that integrated software items behave as described in the architectural design, not just that they pass arbitrary test cases',
      'Anomalies found during integration testing must be entered into the Clause 9 problem resolution process — they must be evaluated for safety impact, not silently fixed and re-tested',
      'Regression testing must be performed after any corrective action taken during integration to confirm the fix has not introduced new defects in previously passing test areas',
      'Integration test records (plans, test cases, execution logs, anomaly reports, and re-test evidence) must be retained as objective evidence and included in the technical file or device history record'
    ],
    classes: ['B', 'C']
  },
  {
    id: 'system-testing',
    clause: 'Clause 5.7',
    title: 'Software System Testing',
    icon: '✅',
    summary: 'Test the complete software system against all documented software requirements.',
    introDetails: [
      'Test all software requirements from the requirements specification',
      'Execute regression tests after any software changes',
      'Document test cases, expected results, and actual results',
      'Record and evaluate all anomalies found during testing',
      'Maintain traceability from test cases back to requirements'
    ],
    advancedDetails: [
      'System tests must provide evidence that the software satisfies all software requirements — test coverage must be demonstrable through bidirectional traceability between test cases and requirements',
      'Test case design techniques relevant to IEC 62304: equivalence partitioning (group inputs by expected behaviour), boundary value analysis (test at and around limits), and pairwise testing for multi-parameter interactions',
      'Amendment 1 update to §5.7: cybersecurity testing must be considered — penetration testing, fuzz testing, or other security verification appropriate to the security risk must be planned and executed as part of system testing',
      'The test environment must be documented and controlled; differences between the test environment and the intended use environment must be analysed and shown not to affect the validity of test results',
      'All anomalies discovered during system testing must be evaluated for safety impact and managed through the Clause 9 process — the decision to accept, fix, or defer each anomaly must be documented with rationale',
      'Regression testing must be defined and executed after any defect fix or code change during the system testing phase; the scope of regression must be justified based on the risk and extent of the change'
    ],
    classes: ['A', 'B', 'C']
  },
  {
    id: 'release',
    clause: 'Clause 5.8',
    title: 'Software Release',
    icon: '🚀',
    summary: 'Confirm all development activities are complete and the software is ready for release.',
    introDetails: [
      'Verify all planned development activities have been completed',
      'Evaluate and document all known anomalies',
      'Assign and document the software version identifier',
      'Archive the released software version and all associated records',
      'Create release notes summarising the software version'
    ],
    advancedDetails: [
      'Before release, a formal gate review or checklist must confirm: all planned development activities are complete (or formally waived with rationale), all anomalies are resolved or accepted, and all traceability records are up to date',
      'The software version identifier must uniquely identify the released version; it must appear in the software itself and in all associated documentation — semantic versioning (MAJOR.MINOR.PATCH) is widely adopted',
      'The known anomalies list (Software Problem Report Summary) must be formally evaluated: each open anomaly must be assessed for patient safety impact, and the decision to release with open items must be made by appropriate authority and documented',
      'The software archive must preserve: the exact source code, build instructions, build tools and their versions, and all SOUP at the exact versions used — sufficient to reproduce the released build for a regulatory investigation years later',
      'Release notes must include: version identifier, release date, a summary of changes from the previous version, and all anomalies that remain open at release with their assessed safety impact',
      'For Class C, the release gate must also confirm that software risk management activities are complete and that the residual risk has been evaluated as acceptable within the ISO 14971 risk management plan'
    ],
    classes: ['A', 'B', 'C']
  },
  {
    id: 'maintenance',
    clause: 'Clause 6',
    title: 'Software Maintenance Process',
    icon: '🔄',
    summary: 'Plan and control modifications to released software throughout the product lifecycle.',
    introDetails: [
      'Establish a feedback and problem monitoring process for released software',
      'Analyse all change requests for safety impact before implementing',
      'Apply the appropriate development process activities to changes',
      'Re-evaluate the software safety classification if scope changes',
      'Maintain records of all problems and their resolutions'
    ],
    advancedDetails: [
      'A maintenance plan (or equivalent procedure) must describe how problems and change requests are received, logged, evaluated, prioritised, implemented, and verified — referencing the appropriate §5 development activities to apply for each change type',
      'Every change request must undergo an impact analysis before implementation: does the change affect safety-related software items? Does it require updates to risk analysis? Could it introduce new hazardous situations?',
      'Changes that affect safety-related software items must re-apply the relevant §5 development activities (requirements update, design review, testing, regression) at the depth appropriate for the safety class of the affected item',
      'If a change materially expands the intended use or introduces significant new functionality, the software safety classification must be re-evaluated — the class of individual software items may need to increase',
      'Post-market surveillance data (complaints, field reports, vigilance reports) must feed into the maintenance process; the manufacturer must have a mechanism to detect when field data indicates a safety issue requiring a software change',
      'Records of all problems and changes must maintain the complete audit trail: original problem report, impact analysis, change implementation record, and verification evidence — gaps in this chain are a critical audit finding'
    ],
    classes: ['A', 'B', 'C']
  },
  {
    id: 'risk-management',
    clause: 'Clause 7',
    title: 'Software Risk Management',
    icon: '⚠️',
    summary: 'Identify, evaluate, and control software contributions to device hazards, integrating with ISO 14971.',
    introDetails: [
      'Identify software items that could contribute to hazardous situations',
      'Evaluate the effectiveness of software risk control measures',
      'Implement and verify software risk control measures',
      'Integrate software risk activities with the ISO 14971 device risk management process',
      'Document the relationship between software failures and device-level risks'
    ],
    advancedDetails: [
      'Software risk management under IEC 62304 is not a standalone activity — it must be integrated with the ISO 14971 risk management process for the device; the software risk analysis contributes to and is informed by the device-level risk management file',
      'Amendment 1 clarified key terminology: a HAZARD is a potential source of harm (e.g., incorrect dose calculation); a HAZARDOUS SITUATION is the circumstance where a person is exposed to that hazard (e.g., patient receives the incorrect dose). Software failure modes must be linked to hazardous situations, not just abstract hazards',
      'For each software item contributing to a hazardous situation, the risk contribution must be quantified: what is the probability that the software failure leads to the hazardous situation? This probability feeds into the ISO 14971 risk estimation for that hazard',
      'Software risk control measures include: defensive coding, input range checking, redundancy, failsafe states, alarms, and use restrictions — each must be implemented as a software item and verified as effective through testing',
      'SOUP anomalies must be evaluated: for each known anomaly in a SOUP item, the manufacturer must assess whether the anomaly could contribute to a hazardous situation in the intended use environment and document the assessment with a conclusion',
      'Residual risk from software failures must be evaluated at the device level after all risk controls are in place — the decision that residual risk is acceptable must be made in the context of the overall device risk-benefit analysis per ISO 14971 §8'
    ],
    classes: ['B', 'C']
  },
  {
    id: 'configuration',
    clause: 'Clause 8',
    title: 'Software Configuration Management',
    icon: '📦',
    summary: 'Identify, control, and track all software configuration items throughout the lifecycle.',
    introDetails: [
      'Identify all software items that require configuration control',
      'Establish a configuration management system and process',
      'Control changes to software items through formal change control',
      'Track and report the status of all configuration items',
      'Include SOUP items in the configuration management system'
    ],
    advancedDetails: [
      'A Configuration Management Plan (CMP) must define: what is under CM (software items, SOUP, tools, test environments), the identification scheme, the change control process, how baselines are established, and the audit approach',
      'Every software configuration item (SCI) must be uniquely identified by name and version; the identification scheme must be defined in the CMP and applied consistently across all items and across all projects',
      'Change control requires: a change request, an impact assessment, approval by an appropriate authority, controlled implementation, verification that the change was correctly implemented, and an updated baseline — undocumented hotfixes are a critical regulatory audit finding',
      'A baseline is a defined, frozen set of configuration items at a specific point in time (e.g., at release) — baselines enable reproduction of any released configuration and support regression analysis when field problems are reported',
      'All SOUP items must be under CM with their exact version or revision identifier recorded — “latest” or “current” is not acceptable; the manufacturer must be able to reproduce the exact SOUP version used in any released product',
      'CM records must be retained for the lifetime of the device plus any applicable regulatory retention requirement (typically 5–15 years depending on jurisdiction) — records must be sufficient to reconstruct the complete configuration of any released software version'
    ],
    classes: ['A', 'B', 'C']
  },
  {
    id: 'problem-resolution',
    clause: 'Clause 9',
    title: 'Problem Resolution Process',
    icon: '🛠️',
    summary: 'Systematically analyse, resolve, and document problems encountered during development and maintenance.',
    introDetails: [
      'Establish a problem reporting and tracking system',
      'Analyse each problem for potential safety impact',
      'Investigate the root causes of significant problems',
      'Document the resolution and verify the fix is effective',
      'Evaluate problems for possible regulatory reporting obligations'
    ],
    advancedDetails: [
      'Every problem must be logged — even problems determined upon analysis not to be defects must be recorded with the rationale for closure; undocumented informal fixes discovered during audit are a common critical finding',
      'Every logged problem must undergo a safety impact assessment: could this problem, in its current or a released version, contribute to a hazardous situation? The assessment must be documented and retained with the problem record',
      'Root cause analysis is required for significant problems, especially those that escape into released software — root cause findings must feed back into process corrective actions to prevent recurrence',
      'Resolution verification must confirm: the fix resolves the original problem (re-test or re-inspection), the fix does not introduce new defects (regression test), and the fix does not create new safety risks (re-evaluate the relevant risk controls)',
      'Problems found in released software must be assessed against the manufacturer’s regulatory reporting obligations — EU MDR Article 87, EU IVDR Article 82, and US 21 CFR 803 each require reporting of malfunctions that could lead to serious injury if they were to recur',
      'Trend analysis should be applied to problem data — recurring problems in the same software area may indicate a systemic design or process weakness requiring a corrective action beyond individual bug fixes'
    ],
    classes: ['A', 'B', 'C']
  }
];

// ---------- STATE ----------
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

// ---------- RENDER ----------
// Builds all phase cards from the phases array and inserts them into
// #phases-grid. Called once on page load; after that, level changes use
// updateDetailsContent() so the rest of the card DOM is not rebuilt.
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
  // separate HTML file) can read the same value when printing the certificate.
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
document.addEventListener('DOMContentLoaded', function () {

  // Restore the level the user last chose. localStorage.getItem() returns
  // null if the key has never been set (first visit), so we only override
  // the 'intro' default if the stored value is explicitly 'advanced'.
  const savedLevel = localStorage.getItem('62304_trainingLevel');
  if (savedLevel === 'advanced') {
    activeLevel = 'advanced'; // override the default before renderPhases() runs
  }

  // Build all the card DOM. renderPhases() reads `activeLevel` internally,
  // so the correct detail bullets are shown from the very first paint.
  renderPhases();

  // Sync the level button highlight to match the restored activeLevel.
  // renderPhases() creates the card content but doesn't know about the
  // button elements, so we update their CSS classes here separately.
  document.querySelectorAll('.level-btn').forEach(function (btn) {
    btn.classList.toggle('active', btn.dataset.level === activeLevel);
  });

  // EVENT DELEGATION — one listener on the grid handles clicks for ALL cards.
  // The alternative (a listener per card) is less efficient and would need to
  // be re-attached every time renderPhases() is called.
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
});
