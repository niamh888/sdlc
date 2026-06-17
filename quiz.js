// ============================================================
// quiz.js  —  Quiz page: shuffle, timer, scoring, results
// ============================================================

// ---------- DATA ----------
// 15 question objects. Each holds the question string, four option strings,
// the index of the correct answer (0-based), and an explanation shown after
// the user answers.

const questions = [
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

// ---------- STATE ----------
// One object holds everything the quiz needs to track. Keeping it together
// makes resetQuiz() trivial — just overwrite these properties and start fresh.
const quizState = {
  shuffled: [],       // questions in random order for this attempt
  currentIndex: 0,    // which question we're on (0-based)
  score: 0,           // number of correct answers so far
  answered: false,    // prevents double-answering the same question
  timerId: null,      // reference returned by setInterval — needed to cancel it
  timeLeft: 30        // seconds remaining for the current question
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
  quizState.shuffled = shuffleArray(questions);
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

  const prefix = result === 'correct' ? '✓ Correct. ' : '✗ Incorrect. ';
  feedbackText.textContent = prefix + explanation;
  feedbackText.style.color = result === 'correct' ? 'var(--success)' : 'var(--danger)';

  // Change the button label on the last question.
  const isLast = quizState.currentIndex === quizState.shuffled.length - 1;
  nextBtn.textContent = isLast ? 'See Results' : 'Next Question';

  // Adding 'visible' triggers the CSS display:flex on the feedback panel.
  feedbackEl.classList.add('visible');
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
  const passed = pct >= 70; // 70% pass mark

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
}

// ---------- RESET ----------
function resetQuiz() {
  clearTimer();
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
  const t = quizState.timeLeft;

  display.textContent = t;

  // Remove both warning classes first, then re-apply the correct one.
  container.classList.remove('warning', 'danger');
  if (t <= 10 && t > 5) container.classList.add('warning');
  if (t <= 5) container.classList.add('danger');
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
  feedbackText.textContent = '⏱ Time\'s up. The correct answer was: "' + q.options[q.correct] + '". ' + q.explanation;
  feedbackText.style.color = 'var(--warning)';

  const isLast = quizState.currentIndex === quizState.shuffled.length - 1;
  document.getElementById('next-question').textContent = isLast ? 'See Results' : 'Next Question';
  document.getElementById('question-feedback').classList.add('visible');
}

// ---------- INIT ----------
document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('begin-quiz').addEventListener('click', startQuiz);
  document.getElementById('next-question').addEventListener('click', nextQuestion);
  document.getElementById('retry-quiz').addEventListener('click', resetQuiz);
});
