var questions = [
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

var quizState = {
  shuffled: [],
  currentIndex: 0,
  score: 0,
  answered: false,
  timerId: null,
  timeLeft: 30
};

function shuffleArray(arr) {
  var copy = arr.slice();
  for (var i = copy.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}

function showQuizScreen(id) {
  document.querySelectorAll('.quiz-screen').forEach(function (screen) {
    screen.classList.remove('active');
  });
  document.getElementById(id).classList.add('active');
}

function startQuiz() {
  quizState.shuffled = shuffleArray(questions);
  quizState.currentIndex = 0;
  quizState.score = 0;
  quizState.answered = false;

  showQuizScreen('quiz-active');
  showQuestion();
}

function showQuestion() {
  clearTimer();

  var q = quizState.shuffled[quizState.currentIndex];
  var total = quizState.shuffled.length;
  var idx = quizState.currentIndex;

  quizState.answered = false;

  document.getElementById('question-counter').textContent = 'Question ' + (idx + 1) + ' of ' + total;
  document.getElementById('quiz-progress-bar').style.width = ((idx / total) * 100) + '%';
  document.getElementById('question-text').textContent = q.q;

  var optionsGrid = document.getElementById('options-grid');
  optionsGrid.innerHTML = '';

  q.options.forEach(function (opt, i) {
    var btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = opt;
    btn.addEventListener('click', function () { selectAnswer(i); });
    optionsGrid.appendChild(btn);
  });

  document.getElementById('question-feedback').classList.remove('visible');

  startTimer();
}

function selectAnswer(selectedIndex) {
  if (quizState.answered) return;
  quizState.answered = true;
  clearTimer();

  var q = quizState.shuffled[quizState.currentIndex];
  var isCorrect = selectedIndex === q.correct;

  if (isCorrect) quizState.score++;

  document.querySelectorAll('.option-btn').forEach(function (btn, i) {
    btn.disabled = true;
    if (i === q.correct) btn.classList.add('correct');
    else if (i === selectedIndex) btn.classList.add('incorrect');
  });

  showFeedback(isCorrect ? 'correct' : 'incorrect', q.explanation, q.options[q.correct]);
}

function showFeedback(result, explanation, correctAnswer) {
  var feedbackEl = document.getElementById('question-feedback');
  var feedbackText = document.getElementById('feedback-text');
  var nextBtn = document.getElementById('next-question');

  var prefix = result === 'correct' ? '✓ Correct. ' : '✗ Incorrect. ';
  feedbackText.textContent = prefix + explanation;
  feedbackText.style.color = result === 'correct' ? 'var(--success)' : 'var(--danger)';

  var isLast = quizState.currentIndex === quizState.shuffled.length - 1;
  nextBtn.textContent = isLast ? 'See Results' : 'Next Question';

  feedbackEl.classList.add('visible');
}

function nextQuestion() {
  quizState.currentIndex++;

  if (quizState.currentIndex >= quizState.shuffled.length) {
    showResults();
  } else {
    showQuestion();
  }
}

function showResults() {
  var score = quizState.score;
  var total = quizState.shuffled.length;
  var pct = Math.round((score / total) * 100);
  var passed = pct >= 70;

  showQuizScreen('quiz-results');

  document.getElementById('results-icon').textContent = passed ? '🎓' : '📚';
  document.getElementById('results-heading').textContent = passed ? 'Assessment Passed' : 'Keep Studying';
  document.getElementById('score-display').textContent = score;

  document.getElementById('results-message').textContent = passed
    ? 'Excellent work! You scored ' + pct + '%, demonstrating solid knowledge of IEC 62304 lifecycle processes.'
    : 'You scored ' + pct + '%. Review the Learn section and focus on areas where you lost marks, then try again.';

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

function resetQuiz() {
  clearTimer();
  showQuizScreen('quiz-start');
}

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
  var display = document.getElementById('timer-display');
  var container = document.getElementById('quiz-timer');
  var t = quizState.timeLeft;

  display.textContent = t;
  container.classList.remove('warning', 'danger');

  if (t <= 10 && t > 5) container.classList.add('warning');
  if (t <= 5) container.classList.add('danger');
}

function handleTimeout() {
  if (quizState.answered) return;
  quizState.answered = true;

  var q = quizState.shuffled[quizState.currentIndex];

  document.querySelectorAll('.option-btn').forEach(function (btn, i) {
    btn.disabled = true;
    if (i === q.correct) btn.classList.add('correct');
  });

  var feedbackText = document.getElementById('feedback-text');
  feedbackText.textContent = '⏱ Time\'s up. The correct answer was: "' + q.options[q.correct] + '". ' + q.explanation;
  feedbackText.style.color = 'var(--warning)';

  var isLast = quizState.currentIndex === quizState.shuffled.length - 1;
  document.getElementById('next-question').textContent = isLast ? 'See Results' : 'Next Question';
  document.getElementById('question-feedback').classList.add('visible');
}

document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('begin-quiz').addEventListener('click', startQuiz);
  document.getElementById('next-question').addEventListener('click', nextQuestion);
  document.getElementById('retry-quiz').addEventListener('click', resetQuiz);
});
