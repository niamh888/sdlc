// ============================================================
// quiz.js  —  Quiz page: shuffle, timer, scoring, results
// ============================================================

// ---------- DATA ----------
// Two question sets — one per training level. Each question holds the question
// string, four option strings, the index of the correct answer (0-based), and
// an explanation shown after the user answers.
// getQuestions() selects the right set based on the level stored in localStorage.

// INTRODUCTORY — overview-level questions suitable for first-time learners.
const introQuestions = [
  {
    q: 'What are the three software safety classes defined in IEC 62304?',
    options: ['Class 1, Class 2, Class 3', 'Class A, Class B, Class C', 'Low, Medium, High', 'Minor, Serious, Critical'],
    correct: 1,
    explanation: 'IEC 62304 defines Class A (no injury possible), Class B (non-serious injury possible), and Class C (serious injury or death possible), based on the consequence if the software were to fail.'
  },
  {
    q: 'Which clause of IEC 62304 covers software development planning?',
    options: ['Clause 4', 'Clause 5.1', 'Clause 6', 'Clause 8'],
    correct: 1,
    explanation: 'Clause 5.1 requires the manufacturer to establish a software development plan that defines the lifecycle model, activities, deliverables, and standards to be used.'
  },
  {
    q: 'What does the acronym SOUP stand for in IEC 62304?',
    options: ['Software of Unknown Provenance', 'System of Unverified Programming', 'Source of Unqualified Products', 'Software of Undefined Process'],
    correct: 0,
    explanation: 'SOUP is Software of Unknown Provenance — pre-existing software not developed under IEC 62304, such as open-source libraries, operating systems, or commercial off-the-shelf components.'
  },
  {
    q: 'Detailed design documentation (Clause 5.4) is mandatory for which safety class?',
    options: ['Class A only', 'Class B and C', 'Class C only', 'All classes'],
    correct: 2,
    explanation: 'Clause 5.4 (Software Detailed Design) is only required for Class C software. Classes A and B require architectural design under Clause 5.3 but not unit-level detailed design documentation.'
  },
  {
    q: 'Which international standard does IEC 62304 Clause 7 link software risk management to?',
    options: ['ISO 13485', 'ISO 14971', 'IEC 60601-1', 'ISO 9001'],
    correct: 1,
    explanation: 'Clause 7 integrates with ISO 14971, the risk management standard for medical devices. Software risk control measures must be evaluated within the broader device risk management framework.'
  },
  {
    q: 'What is the primary purpose of software configuration management under Clause 8?',
    options: ['To plan software testing activities', 'To control and track software items throughout the lifecycle', 'To document software risk mitigations', 'To define the software release process'],
    correct: 1,
    explanation: 'Configuration management ensures all software items and their versions are uniquely identified, controlled, and traceable — critical for reproducibility and regulatory audit trails.'
  },
  {
    q: 'If a software failure could contribute to serious injury or death, which safety class applies?',
    options: ['Class A', 'Class B', 'Class C', 'There is no Class D'],
    correct: 2,
    explanation: 'Class C applies when software failure can contribute to serious injury or death. Class A means no injury is possible; Class B means only non-serious injury is possible. There is no Class D in IEC 62304.'
  },
  {
    q: 'Which clause covers the software maintenance process in IEC 62304?',
    options: ['Clause 5', 'Clause 6', 'Clause 7', 'Clause 9'],
    correct: 1,
    explanation: 'Clause 6 covers the Software Maintenance Process, governing how modifications, corrections, and enhancements to released software are planned and controlled.'
  },
  {
    q: 'Integration test plans and records are explicitly required for which safety classes?',
    options: ['Class A only', 'Class A and B', 'Class B and C', 'All classes equally'],
    correct: 2,
    explanation: 'Clause 5.6 requires integration test plans and results for Class B and C software. Class A has lighter requirements for integration activities.'
  },
  {
    q: 'Before software can be released under Clause 5.8, what must the manufacturer verify?',
    options: ['Marketing and commercial approval', 'All planned development activities have been completed', 'FDA 510(k) clearance has been received', 'CE marking has been obtained'],
    correct: 1,
    explanation: 'Clause 5.8 requires objective evidence that all planned software development activities are complete and all known anomalies have been evaluated before the software is released.'
  },
  {
    q: 'When a change request is received for released software, what is the first required action?',
    options: ['Immediately implement the fix and retest', 'Analyse the change for potential safety impact', 'Archive the current released version', 'Update the software requirements specification'],
    correct: 1,
    explanation: 'Under Clause 6, every change to released software must first be analysed to determine its impact on safety and the scope of additional verification and validation required.'
  },
  {
    q: 'Software requirements under Clause 5.2 must be traceable to what?',
    options: ['Business requirements and stakeholder requests', 'The system requirements specification', 'User stories and acceptance criteria', 'The device risk register only'],
    correct: 1,
    explanation: 'Clause 5.2 requires software requirements to be traceable to the system requirements specification, ensuring every device-level requirement has been addressed by software requirements.'
  },
  {
    q: 'What minimum information must be documented when a manufacturer uses SOUP?',
    options: ["The SOUP's complete source code", "The title, manufacturer, and version of the SOUP", "The SOUP's full validation test history", "The SOUP's patent and licensing status"],
    correct: 1,
    explanation: "IEC 62304 requires that SOUP be identified by its title, manufacturer, and version so it can be tracked as a configuration item and its known anomalies can be evaluated."
  },
  {
    q: 'Which class of medical device software has the most comprehensive IEC 62304 requirements?',
    options: ['Class A', 'Class B', 'Class C', 'All classes have identical requirements'],
    correct: 2,
    explanation: 'Class C imposes the most stringent requirements, including detailed design documentation, rigorous unit testing, and complete traceability — reflecting the highest potential severity of harm.'
  },
  {
    q: 'What must a problem resolution process under Clause 9 include?',
    options: ['Immediate product recall procedures', 'Analysis of problems for safety impact and documented resolution', 'Customer compensation frameworks', 'Regulatory filing procedures only'],
    correct: 1,
    explanation: 'Clause 9 requires that problems be evaluated for safety impact, investigated for root cause, resolved, verified, and documented — with records maintained throughout the process.'
  }
];

// ADVANCED — clause-referenced questions requiring in-depth knowledge of
// IEC 62304:2006+AMD1:2015, including Amendment 1 changes and audit context.
const advancedQuestions = [
  {
    q: 'Under Amendment 1, what condition must be established by the risk management process before a software item may be classified as Class A?',
    options: [
      'The software item has no user interface',
      'The risk management process determines the software item cannot contribute to a hazardous situation',
      'The software item runs on Class I medical hardware only',
      'The software item was developed before the current regulatory framework applied'
    ],
    correct: 1,
    explanation: 'Amendment 1 revised §4.3 so that Class A requires the product/system risk management process to explicitly determine that the software item cannot contribute to a hazardous situation. It is not sufficient to assume low risk based on functionality — the risk analysis must make this determination.'
  },
  {
    q: 'Under §4.3 (Amendment 1), if a software item is the sole control measure preventing serious injury or death, which safety class must it be assigned?',
    options: ['Class A', 'Class B', 'Class C', 'The class is determined by the hardware platform it runs on'],
    correct: 2,
    explanation: 'Amendment 1\'s revised §4.3 states that a software item that is the sole control measure preventing serious injury or death must be Class C, regardless of other risk controls elsewhere in the device. This reflects the sole-reliance principle from ISO 14971.'
  },
  {
    q: 'Amendment 1 introduced a clarified distinction between two key terms. Which pairing is correct?',
    options: [
      'HAZARD = the circumstances of exposure; HAZARDOUS SITUATION = the potential source of harm',
      'HAZARD = a software defect; HAZARDOUS SITUATION = a defect that reaches a released product',
      'HAZARD = the potential source of harm; HAZARDOUS SITUATION = the circumstances where a person is exposed to that hazard',
      'HAZARD and HAZARDOUS SITUATION are defined as synonymous in Amendment 1'
    ],
    correct: 2,
    explanation: 'Amendment 1 clarified: a HAZARD is a potential source of harm (e.g., incorrect dose calculation), while a HAZARDOUS SITUATION is the circumstance in which a person is exposed to that hazard (e.g., patient receives an incorrect dose). Software failure modes must be linked to hazardous situations, not just to abstract hazards.'
  },
  {
    q: 'IEC 62304 §5.3 requires SOUP to be documented in the architectural design. Which set of information is required as a minimum?',
    options: [
      'The SOUP\'s complete source code and build scripts',
      'Title, manufacturer, version identifier, intended use, functional requirements it must meet, and its required operating environment',
      'The SOUP\'s CE marking certificate or FDA 510(k) clearance number',
      'The SOUP\'s full validation test history and a list of all known anomalies'
    ],
    correct: 1,
    explanation: '§5.3 requires SOUP to be identified by: name/title, manufacturer, version or revision identifier, intended use within the system, the functional and performance requirements it must meet, and the hardware/software environment it requires. This information is needed to evaluate SOUP as a configuration item and to assess whether its known anomalies are relevant.'
  },
  {
    q: 'A configuration management record identifies a SOUP component as "latest stable release." Does this satisfy IEC 62304 §8?',
    options: [
      'Yes, if the SOUP vendor provides regular security updates',
      'Yes, for Class A and B software only',
      'No — SOUP must be identified by an exact version or revision identifier',
      'No — SOUP must not be used unless the full source code is available for review'
    ],
    correct: 2,
    explanation: '§8 requires all SOUP items to be under configuration management with an exact version or revision identifier recorded. "Latest" or "current" is not acceptable because it prevents the manufacturer from reproducing the exact configuration used in any released product — a requirement that may need to be met years later during a regulatory investigation.'
  },
  {
    q: 'After release, the manufacturer discovers a known anomaly in a SOUP component. What does IEC 62304 §7 require?',
    options: [
      'Immediately withdraw the product from the market pending investigation',
      'Evaluate whether the anomaly could contribute to a hazardous situation in the intended use environment and document the assessment with a conclusion',
      'Notify the SOUP vendor and await a patch before taking any further action',
      'Issue a corrective software update within 30 days of discovery'
    ],
    correct: 1,
    explanation: '§7 requires that for each known anomaly in a SOUP item, the manufacturer assesses whether it could contribute to a hazardous situation in the intended use environment and documents the conclusion. Market withdrawal is only required if the risk assessment determines that the risk is unacceptable and cannot be mitigated otherwise.'
  },
  {
    q: 'A Class C software item implements a risk control measure identified in the ISO 14971 risk management file. Which IEC 62304 clause governs the requirement to verify its effectiveness?',
    options: [
      'Clause 5.7 — Software System Testing',
      'Clause 5.8 — Software Release',
      'Clause 7 — Software Risk Management',
      'Clause 9 — Problem Resolution'
    ],
    correct: 2,
    explanation: 'Clause 7 requires that software items implementing risk control measures are verified as effective. The verification evidence must feed into the ISO 14971 risk management file to demonstrate that the control measure functions as intended. System testing (§5.7) provides the test evidence, but the requirement to verify effectiveness is a §7 obligation.'
  },
  {
    q: 'Under §5.8, under what condition may a manufacturer release software that has unresolved known anomalies?',
    options: [
      'Never — all anomalies must be resolved before release is permitted',
      'Only for Class A software where no injury is possible',
      'When each open anomaly has been evaluated for safety impact and the decision to release has been made by appropriate authority and documented',
      'Only when the anomalies are user interface issues with no functional impact'
    ],
    correct: 2,
    explanation: '§5.8 does not require zero open anomalies at release. It requires that all known anomalies are evaluated for patient safety impact, and that the decision to release with open items is made by appropriate authority with the rationale documented. This is a common area of confusion in regulatory submissions.'
  },
  {
    q: 'During a §5.5 unit verification activity for Class C software, a defect is found and silently fixed by the developer without logging a problem report. Is this acceptable under IEC 62304?',
    options: [
      'Yes, if the fix is verified and the unit re-tested successfully',
      'Yes, if the defect was found before the unit was formally baselined',
      'No — all anomalies found during verification must be documented through the Clause 9 problem resolution process',
      'No — but only if the defect affected a safety-related software item'
    ],
    correct: 2,
    explanation: 'Clause 9 requires all problems to be logged regardless of when they are found. Silent fixes — even those re-verified successfully — bypass the required safety impact assessment and root cause analysis. Undocumented fixes are one of the most common critical findings in notified body audits of Class C software.'
  },
  {
    q: 'What specific addition did Amendment 1 make to the requirements of §5.1 Software Development Planning?',
    options: [
      'It added a requirement to specify the waterfall lifecycle model as the default',
      'It removed the requirement to reference ISO 13485 in the plan',
      'It added an explicit requirement to address cybersecurity in the software development plan',
      'It added a requirement to produce a separate test plan for each software item'
    ],
    correct: 2,
    explanation: 'Amendment 1 added cybersecurity as a topic that must be explicitly addressed in the software development plan, including how security requirements are identified, allocated to software items, implemented, and verified. The original 2006 standard had no explicit cybersecurity planning requirement.'
  },
  {
    q: 'A software engineer proposes using a static analysis tool to extract comments from completed code and format them as the "detailed design" documentation for Class C. What is the correct assessment?',
    options: [
      'Acceptable, provided the static analysis tool is listed in the software development plan',
      'Acceptable for Class B but not Class C',
      'Not acceptable — detailed design must describe intended behaviour before implementation, not document what was built after the fact',
      'Acceptable if the output is reviewed and approved by a second engineer'
    ],
    correct: 2,
    explanation: '§5.4 detailed design must be specified before implementation begins — it is the basis for implementation, not a retrospective description of it. Extracting documentation from existing code reverses the required sequence, does not demonstrate planned design intent, and has been highlighted in the IEC 62304 2nd edition design specification as a known misuse that the revision aims to address.'
  },
  {
    q: 'Under §6, a change request is received to add a new clinical feature to released Class C software. Which development activities are required?',
    options: [
      'The maintenance process only — new features are categorised as maintenance activities',
      'A brief impact assessment followed by direct implementation and regression testing',
      'The full §5 development activities appropriate for the safety class of the affected software items, including requirements, design, testing, and risk management',
      'The change must be rejected — new features require a new regulatory submission before implementation'
    ],
    correct: 2,
    explanation: '§6 requires that changes to released software that affect safety-related software items re-apply the relevant §5 development activities at the depth appropriate for the safety class. Adding new features is not a pure maintenance activity — it requires requirements analysis, design, risk management, and testing to be applied to the new and affected software items.'
  },
  {
    q: 'Which of the following correctly defines "legacy software" as introduced in §4.4 (Amendment 1)?',
    options: [
      'Software that was developed more than 10 years before the current review',
      'Software that was deployed and in use before IEC 62304 was applied to it',
      'Software that was developed for a previous device version and reused without modification',
      'Software that has not been validated for the current intended use of the device'
    ],
    correct: 1,
    explanation: '§4.4 (added in Amendment 1) defines legacy software as software already deployed and in use before IEC 62304 was applied. Such software can be brought into compliance by documenting its development history, evaluating it against the standard\'s requirements, and addressing identified gaps — full retrospective development documentation is not required.'
  },
  {
    q: 'Under §9, a problem is investigated and determined not to be a software defect. What does IEC 62304 require?',
    options: [
      'Nothing — only confirmed defects need to be formally recorded',
      'Record the problem and the rationale for the "not a defect" conclusion',
      'Record it only if found in a safety-related software item',
      'Escalate to the risk management team for independent review'
    ],
    correct: 1,
    explanation: 'Clause 9 requires all problems to be logged, including those ultimately determined not to be defects. The record must include the rationale for closure. Undocumented investigations — even for non-defects — are a common critical finding during regulatory audits because they leave gaps in the objective evidence trail.'
  },
  {
    q: 'A bidirectional traceability matrix is required under IEC 62304. What must it trace in both directions?',
    options: [
      'Source code commits to developer names, and developer names to their qualifications',
      'Software requirements to system requirements, and software requirements to test cases',
      'Risk control measures to test cases only',
      'Software items to their assigned safety class, and safety classes to the risk management file'
    ],
    correct: 1,
    explanation: '§5.2 and §5.7 together require bidirectional traceability: each software requirement must trace up to a system requirement (ensuring nothing is implemented without a system-level justification) and down to a test case (ensuring everything required is tested). Gaps in either direction are a common finding in technical file reviews.'
  }
];

// Returns the appropriate question set based on the training level stored in localStorage.
function getQuestions() {
  return localStorage.getItem('62304_trainingLevel') === 'advanced' ? advancedQuestions : introQuestions;
}

// ---------- STATE ----------
// One object holds everything the quiz needs to track. Keeping it together
// makes resetQuiz() trivial — just overwrite these properties and start fresh.
const quizState = {
  shuffled: [],           // questions in random order for this attempt
  currentIndex: 0,        // which question we're on (0-based)
  score: 0,               // number of correct answers so far
  answered: false,        // prevents double-answering the same question
  timerId: null,          // reference returned by setInterval — needed to cancel it
  timeLeft: 30,           // seconds remaining for the current question
  participantName: ''     // entered on the start screen; used on the certificate
};

// ---------- SHUFFLE ----------
// Fisher-Yates shuffle: walks backwards through a copy of the array,
// swapping each element with a randomly chosen earlier element.
// Result: every permutation is equally likely — a fair shuffle.
function shuffleArray(arr) {
  const copy = arr.slice(); // slice() with no arguments copies the whole array
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    // Destructuring swap — swaps copy[i] and copy[j] without a temp variable.
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ---------- SCREEN SWITCHING ----------
// The three quiz screens (start / active / results) share the same space.
// Only the one with class 'active' is displayed (see CSS).
function showQuizScreen(id) {
  document.querySelectorAll('.quiz-screen').forEach(function (screen) {
    screen.classList.remove('active');
  });
  document.getElementById(id).classList.add('active');
}

// ---------- START ----------
function startQuiz() {
  // Require a name before starting — it appears on the certificate.
  const nameInput = document.getElementById('participant-name');
  const nameError = document.getElementById('participant-name-error');
  const name = nameInput ? nameInput.value.trim() : '';

  if (!name) {
    if (nameError) nameError.textContent = 'Please enter your name to begin.';
    if (nameInput) nameInput.focus();
    return;
  }
  if (nameError) nameError.textContent = '';

  quizState.participantName = name;
  // getQuestions() picks introQuestions or advancedQuestions based on localStorage.
  quizState.shuffled = shuffleArray(getQuestions());
  quizState.currentIndex = 0;
  quizState.score = 0;
  quizState.answered = false;

  showQuizScreen('quiz-active');
  showQuestion();
}

// ---------- SHOW QUESTION ----------
function showQuestion() {
  clearTimer(); // cancel any timer still running from the previous question

  const q = quizState.shuffled[quizState.currentIndex];
  const total = quizState.shuffled.length;
  const idx = quizState.currentIndex;

  quizState.answered = false;

  document.getElementById('question-counter').textContent = 'Question ' + (idx + 1) + ' of ' + total;

  // Progress bar width as a percentage of questions completed so far.
  document.getElementById('quiz-progress-bar').style.width = ((idx / total) * 100) + '%';
  document.getElementById('question-text').textContent = q.q;

  // Build answer buttons from the options array.
  const optionsGrid = document.getElementById('options-grid');
  optionsGrid.innerHTML = '';

  q.options.forEach(function (opt, i) {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = opt;
    // Each button captures its own index `i` via closure — when clicked,
    // selectAnswer knows which option was chosen.
    btn.addEventListener('click', function () { selectAnswer(i); });
    optionsGrid.appendChild(btn);
  });

  document.getElementById('question-feedback').classList.remove('visible');

  startTimer();
}

// ---------- SELECT ANSWER ----------
function selectAnswer(selectedIndex) {
  // Guard against clicking after time has already expired.
  if (quizState.answered) return;
  quizState.answered = true;
  clearTimer();

  const q = quizState.shuffled[quizState.currentIndex];
  const isCorrect = selectedIndex === q.correct;

  if (isCorrect) quizState.score++;

  // Reveal which answer was correct and mark the user's wrong choice red.
  document.querySelectorAll('.option-btn').forEach(function (btn, i) {
    btn.disabled = true;
    if (i === q.correct) btn.classList.add('correct');
    else if (i === selectedIndex) btn.classList.add('incorrect');
  });

  showFeedback(isCorrect ? 'correct' : 'incorrect', q.explanation);
}

// ---------- FEEDBACK PANEL ----------
function showFeedback(result, explanation) {
  const feedbackEl = document.getElementById('question-feedback');
  const feedbackText = document.getElementById('feedback-text');
  const nextBtn = document.getElementById('next-question');
  const liveRegion = document.getElementById('quiz-feedback-live');

  const prefix = result === 'correct' ? '✓ Correct. ' : '✗ Incorrect. ';
  const fullText = prefix + explanation;

  feedbackText.textContent = fullText;
  feedbackText.style.color = result === 'correct' ? 'var(--success)' : 'var(--danger)';

  // Change the button label on the last question.
  const isLast = quizState.currentIndex === quizState.shuffled.length - 1;
  nextBtn.textContent = isLast ? 'See Results' : 'Next Question';

  // Adding 'visible' triggers the CSS display:flex on the feedback panel.
  feedbackEl.classList.add('visible');

  // Mirror the text into the always-visible live region. Screen readers announce
  // changes to live regions reliably regardless of the visual element's display state.
  if (liveRegion) liveRegion.textContent = fullText;
}

// ---------- NEXT QUESTION ----------
function nextQuestion() {
  quizState.currentIndex++;

  if (quizState.currentIndex >= quizState.shuffled.length) {
    showResults();
  } else {
    showQuestion();
  }
}

// ---------- RESULTS ----------
function showResults() {
  const score = quizState.score;
  const total = quizState.shuffled.length;
  const pct = Math.round((score / total) * 100);
  const passed = pct >= 80; // 80% required for a certificate

  showQuizScreen('quiz-results');

  document.getElementById('results-icon').textContent = passed ? '🎓' : '📚';
  document.getElementById('results-heading').textContent = passed ? 'Assessment Passed' : 'Keep Studying';
  document.getElementById('score-display').textContent = score;

  document.getElementById('results-message').textContent = passed
    ? 'Excellent work! You scored ' + pct + '%, demonstrating solid knowledge of IEC 62304 lifecycle processes.'
    : 'You scored ' + pct + '%. Review the Learn section and focus on areas where you lost marks, then try again.';

  // Build the three breakdown cells (correct / incorrect / percentage) dynamically.
  document.getElementById('results-breakdown').innerHTML =
    '<div class="breakdown-item">' +
      '<span class="breakdown-value" style="color:var(--success)">' + score + '</span>' +
      '<span class="breakdown-label">Correct</span>' +
    '</div>' +
    '<div class="breakdown-item">' +
      '<span class="breakdown-value" style="color:var(--danger)">' + (total - score) + '</span>' +
      '<span class="breakdown-label">Incorrect</span>' +
    '</div>' +
    '<div class="breakdown-item">' +
      '<span class="breakdown-value">' + pct + '%</span>' +
      '<span class="breakdown-label">Score</span>' +
    '</div>';

  // Show or hide the certificate download button based on whether the user passed.
  const certBtn = document.getElementById('download-cert');
  if (passed) {
    populateCertificate(score, total, pct);
    if (certBtn) certBtn.classList.remove('hidden');
  } else {
    if (certBtn) certBtn.classList.add('hidden');
  }
}

// ---------- CERTIFICATE ----------
// Fills in the hidden #certificate element with the participant's details.
// window.print() (triggered by the Download Certificate button) then hides
// everything except #certificate, so the browser renders it as a printable PDF.
function populateCertificate(score, total, pct) {
  const dateStr = new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  // Read the training level that was saved to localStorage on the Learn page.
  // The Learn and Quiz pages are separate HTML files; localStorage is the
  // bridge that carries the user's choice between them.
  // If the key is absent (user never visited the Learn page), we default to Introductory.
  const isAdvanced   = localStorage.getItem('62304_trainingLevel') === 'advanced';
  const levelLabel   = isAdvanced ? 'Advanced Level' : 'Introductory Level';
  const levelDesc    = isAdvanced
    ? 'An in-depth study of IEC 62304:2006+AMD1:2015'
    : 'An introduction to IEC 62304:2006+AMD1:2015';

  // Grab references to each element we need to populate.
  const nameEl       = document.getElementById('cert-name');
  const scoreEl      = document.getElementById('cert-score');
  const dateEl       = document.getElementById('cert-date');
  const courseNameEl = document.getElementById('cert-course-name'); // e.g. "IEC 62304 Essentials — Advanced Level"
  const standardEl   = document.getElementById('cert-standard');   // the descriptive line beneath the course name

  if (nameEl)       nameEl.textContent  = quizState.participantName;
  if (scoreEl)      scoreEl.textContent = score + ' / ' + total + ' (' + pct + '%)';
  if (dateEl)       dateEl.textContent  = dateStr;
  if (courseNameEl) courseNameEl.textContent = 'IEC 62304 Essentials — ' + levelLabel;

  // innerHTML is used here (instead of textContent) because the description
  // contains a <br> line break. The content is entirely our own hardcoded
  // strings — no user input — so innerHTML is safe in this context.
  if (standardEl)   standardEl.innerHTML = levelDesc + '<br>Medical device software — Software life cycle processes';
}

// ---------- RESET ----------
function resetQuiz() {
  clearTimer();
  // Clear any name validation error but keep the name value — no need to retype on retry.
  const nameError = document.getElementById('participant-name-error');
  if (nameError) nameError.textContent = '';
  showQuizScreen('quiz-start');
}

// ---------- TIMER ----------
// setInterval calls its callback every 1000ms (1 second) and returns an ID.
// We store that ID in quizState.timerId so we can cancel it with clearInterval.
function startTimer() {
  quizState.timeLeft = 30;
  updateTimerDisplay();

  quizState.timerId = setInterval(function () {
    quizState.timeLeft--;
    updateTimerDisplay();

    if (quizState.timeLeft <= 0) {
      clearTimer();
      handleTimeout();
    }
  }, 1000);
}

function clearTimer() {
  if (quizState.timerId !== null) {
    clearInterval(quizState.timerId);
    quizState.timerId = null;
  }
}

function updateTimerDisplay() {
  const display = document.getElementById('timer-display');
  const container = document.getElementById('quiz-timer');
  const announcement = document.getElementById('timer-announcement');
  const t = quizState.timeLeft;

  display.textContent = t;

  // Remove both warning classes first, then re-apply the correct one.
  container.classList.remove('warning', 'danger');
  if (t <= 10 && t > 5) container.classList.add('warning');
  if (t <= 5) container.classList.add('danger');

  // Announce threshold moments to screen readers via the assertive live region.
  // Only announce at the exact threshold seconds to avoid constant interruptions.
  if (announcement) {
    if (t === 10) announcement.textContent = '10 seconds remaining';
    else if (t === 5)  announcement.textContent = '5 seconds remaining';
    else if (t === 0)  announcement.textContent = "Time's up";
    else announcement.textContent = '';
  }
}

// ---------- TIMEOUT ----------
// Called when the 30 seconds expire without the user selecting an answer.
function handleTimeout() {
  if (quizState.answered) return;
  quizState.answered = true;

  const q = quizState.shuffled[quizState.currentIndex];

  // Reveal the correct answer even though the user didn't click it.
  document.querySelectorAll('.option-btn').forEach(function (btn, i) {
    btn.disabled = true;
    if (i === q.correct) btn.classList.add('correct');
  });

  const feedbackText = document.getElementById('feedback-text');
  const timeoutText = 'Time\'s up. The correct answer was: "' + q.options[q.correct] + '". ' + q.explanation;
  feedbackText.textContent = '⏱ ' + timeoutText;
  feedbackText.style.color = 'var(--warning)';

  const isLast = quizState.currentIndex === quizState.shuffled.length - 1;
  document.getElementById('next-question').textContent = isLast ? 'See Results' : 'Next Question';
  document.getElementById('question-feedback').classList.add('visible');

  const liveRegion = document.getElementById('quiz-feedback-live');
  if (liveRegion) liveRegion.textContent = timeoutText;
}

// ---------- INIT ----------
document.addEventListener('DOMContentLoaded', function () {
  // Show the current training level on the start screen so the learner knows
  // which question set they are about to sit before they begin.
  const levelNotice = document.getElementById('quiz-level-notice');
  if (levelNotice) {
    const isAdvanced = localStorage.getItem('62304_trainingLevel') === 'advanced';
    levelNotice.innerHTML = isAdvanced
      ? '<span class="level-notice-badge level-notice-advanced">Advanced assessment</span> Questions are clause-referenced and test in-depth knowledge of IEC 62304:2006+AMD1:2015.'
      : '<span class="level-notice-badge level-notice-intro">Introductory assessment</span> Questions cover the core concepts of IEC 62304. Switch to Advanced on the <a href="learn.html">Learn page</a> for a more challenging assessment.';
  }

  document.getElementById('begin-quiz').addEventListener('click', startQuiz);
  document.getElementById('next-question').addEventListener('click', nextQuestion);
  document.getElementById('retry-quiz').addEventListener('click', resetQuiz);
  document.getElementById('download-cert').addEventListener('click', function () {
    // window.print() triggers the browser print dialog. With @media print CSS
    // hiding everything except #certificate, the user saves it as a PDF.
    window.print();
  });
});
