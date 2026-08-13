// ============================================================
// quiz.js  —  Quiz page: shuffle, timer, scoring, results
// ============================================================
//
// ASYNCHRONOUS DATA LOADING
// Both question sets used to be hardcoded arrays in this file — roughly 250
// lines of content. They now live in two separate JSON files:
//
//     data/questions-intro.json      15 overview-level questions
//     data/questions-advanced.json   15 clause-referenced questions
//
// Splitting them fixed a real inefficiency. The old version defined BOTH
// sets on every page load and then threw one away, so every visitor paid to
// parse 30 questions in order to sit 15. Now only the file matching the
// user's chosen level is requested.
//
// This file also demonstrates a pattern worth learning: PREFETCHING. The
// request starts as soon as the page loads, but the result is not needed
// until the user clicks "Begin Assessment". Rather than waiting for the
// click to start the request, we start it immediately and keep the Promise
// in a variable, then await that same Promise on click. By the time the
// learner has typed their name, the questions have almost always arrived,
// so the click feels instant. See startQuestionsLoad() below.
// ============================================================

// ---------- CONFIG ----------
// Which file to fetch for each training level.
const QUESTION_URLS = {
  intro: 'data/questions-intro.json',
  advanced: 'data/questions-advanced.json'
};

// Seconds per question, by level. Advanced questions are clause-referenced
// (see the level notice below) — 30 seconds was tight for reading both the
// question and four answer options before choosing, so Advanced gets double
// the intro level's time. The start screen's wording is generated from this
// object too (see the .js-timer-seconds fill-in in DOMContentLoaded), so the
// two can never say different numbers.
const QUESTION_SECONDS = {
  intro: 30,
  advanced: 60
};

// Minimum time the "Loading questions" state stays visible, to avoid a
// flicker on fast connections. Same reasoning as in learn.js.
const MIN_LOADING_MS = 250;

// ---------- STATE ----------
// One object holds everything the quiz needs to track. Keeping it together
// makes resetQuiz() trivial — just overwrite these properties and start fresh.
const quizState = {
  shuffled: [],           // questions in random order for this attempt
  currentIndex: 0,        // which question we're on (0-based)
  score: 0,               // number of correct answers so far
  answered: false,        // prevents double-answering the same question
  timerId: null,          // reference returned by setInterval — needed to cancel it
  timeLeft: 30,           // seconds remaining for the current question — reset to the
                           // level's actual duration by startTimer(); this default is
                           // only ever seen before that first call
  participantName: ''     // entered on the start screen; used on the certificate
};

// Holds the Promise for the question data — not the data itself.
//
// This is the idea that makes prefetching work, and it surprises most people
// learning async for the first time: A PROMISE IS A VALUE. You can store it
// in a variable, pass it to a function, and await it later — or await it more
// than once. A Promise runs its work only once and then remembers the
// outcome, so awaiting an already-settled Promise returns the remembered
// result instantly rather than repeating the request.
let questionsPromise = null;

// Reads the training level the user selected on the Learn page.
// localStorage is the bridge between the two separate HTML pages.
// Anything other than 'advanced' (including a first visit, where the key
// does not exist at all) falls back to the introductory set.
function getLevel() {
  return localStorage.getItem('62304_trainingLevel') === 'advanced' ? 'advanced' : 'intro';
}

// ---------- LOAD ----------
// Fetches and validates one question set. Errors are deliberately allowed to
// propagate to whoever awaits this — see the note in async-utils.js about not
// catching errors where you cannot act on them.
async function loadQuestions(level) {
  // Promise.all runs the fetch and the anti-flicker delay CONCURRENTLY, so
  // the total wait is the longer of the two rather than the sum of both.
  // Array destructuring on the left picks out the fetch result (element 0);
  // the delay's result is not useful, so it is left unnamed.
  const [questions] = await Promise.all([
    fetchJSON(QUESTION_URLS[level]),
    delay(MIN_LOADING_MS)
  ]);

  // Validate at the boundary, where external data enters the program, so
  // that the rest of the quiz can trust its input completely. A malformed
  // question would otherwise fail much later and much more confusingly —
  // a missing `correct` index, for instance, would silently mark every
  // answer wrong instead of reporting a data problem.
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('The question file did not contain any questions.');
  }

  questions.forEach(function (q, i) {
    const validIndex = typeof q.correct === 'number' && q.correct >= 0 && q.correct < (q.options || []).length;
    if (!q.q || !Array.isArray(q.options) || !validIndex) {
      throw new Error('Question ' + (i + 1) + ' in the question file is incomplete or malformed.');
    }
  });

  return questions;
}

// Starts (or restarts) the background request and stores the Promise.
// Called once on page load, and again by the retry button after a failure.
function startQuestionsLoad() {
  questionsPromise = loadQuestions(getLevel());

  // This no-op .catch() looks pointless but prevents a real annoyance.
  //
  // If a Promise rejects and nothing is listening at that moment, the
  // browser logs "Uncaught (in promise)" to the console. Here the rejection
  // could easily happen while the user is still typing their name — long
  // before startQuiz() awaits it — so there would be no handler attached
  // yet, and the console would fill with a scary-looking warning.
  //
  // Attaching an empty catch marks the rejection as acknowledged. It does
  // NOT swallow the error: .catch() returns a NEW Promise, while
  // questionsPromise itself stays rejected, so the `await` in startQuiz()
  // still throws and still shows the error panel. All this line removes is
  // the spurious console warning.
  questionsPromise.catch(function () { /* handled later, in startQuiz() */ });

  // When the prefetch succeeds, update the question counts shown on the
  // start screen so the wording always matches the actual data rather than
  // a number hardcoded in the HTML.
  questionsPromise
    .then(function (questions) {
      document.querySelectorAll('.js-question-count').forEach(function (el) {
        el.textContent = questions.length;
      });
    })
    .catch(function () { /* start screen keeps its default wording */ });

  return questionsPromise;
}

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
// `async` because it awaits the question data before the quiz can begin.
// An async function used as an event handler is perfectly normal: the browser
// ignores the Promise it returns, which is fine as long as the function
// handles its own errors — which this one does, in the try/catch below.
async function startQuiz() {
  const nameInput = document.getElementById('participant-name');
  const nameError = document.getElementById('participant-name-error');
  const beginBtn = document.getElementById('begin-quiz');
  const loadErrorEl = document.getElementById('questions-error');
  const loadErrorMsgEl = document.getElementById('questions-error-message');

  // Require a name before starting — it appears on the certificate.
  // Validation runs FIRST, before any awaiting, so an empty name is rejected
  // instantly rather than after a needless wait.
  const name = nameInput ? nameInput.value.trim() : '';
  if (!name) {
    if (nameError) nameError.textContent = 'Please enter your name to begin.';
    if (nameInput) nameInput.focus();
    return;
  }
  if (nameError) nameError.textContent = '';

  quizState.participantName = name;

  // ---- STATE 1: LOADING ----
  // Disable the button while we wait. This is not decoration: without it,
  // an impatient double-click would run startQuiz() twice concurrently and
  // start two quizzes on top of each other. Disabling the control that
  // triggered an async operation is the simplest way to prevent that whole
  // class of bug.
  //
  // aria-busy tells assistive technology that this control is mid-operation,
  // so a screen reader user gets the same information the spinner conveys.
  if (beginBtn) {
    beginBtn.disabled = true;
    beginBtn.setAttribute('aria-busy', 'true');
    beginBtn.textContent = 'Loading questions…';
  }
  if (loadErrorEl) loadErrorEl.classList.add('hidden');

  try {
    // If the prefetch has already finished, this resolves immediately with
    // the remembered result — no second network request. If it is still in
    // flight, we simply join the wait already in progress.
    //
    // The `|| startQuestionsLoad()` guard covers the unlikely case where no
    // load has been started yet.
    const questions = await (questionsPromise || startQuestionsLoad());

    // ---- STATE 2: SUCCESS ----
    quizState.shuffled = shuffleArray(questions);
    quizState.currentIndex = 0;
    quizState.score = 0;
    quizState.answered = false;

    // Keep the results screen's "out of N" in step with the real count.
    const scoreTotalEl = document.getElementById('score-total');
    if (scoreTotalEl) scoreTotalEl.textContent = 'out of ' + questions.length;

    showQuizScreen('quiz-active');
    showQuestion();

  } catch (error) {
    // ---- STATE 3: FAILURE ----
    // One catch covers every way the load could have failed: no network,
    // a 404, malformed JSON, or a question that failed validation.
    if (loadErrorEl) loadErrorEl.classList.remove('hidden');
    if (loadErrorMsgEl) loadErrorMsgEl.textContent = error.message;
    console.error('Failed to load quiz questions:', error);

  } finally {
    // `finally` runs whether the try succeeded or threw. Restoring the button
    // here rather than in both branches means it can never be left stuck
    // reading "Loading questions…" — the most common bug in hand-written
    // async UI code, and exactly what finally exists to prevent.
    if (beginBtn) {
      beginBtn.disabled = false;
      beginBtn.removeAttribute('aria-busy');
      beginBtn.textContent = 'Begin Assessment';
    }
  }
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
  // The -text variants, not --success / --danger. Those two are FILL colours,
  // dark enough to carry white text; used as text themselves on a dark theme's
  // card they are too close to the background. The -text roles are the ones with
  // a verified contrast ratio in both themes. The ✓ / ✗ prefix above means the
  // colour is reinforcement rather than the only signal either way.
  feedbackText.style.color = result === 'correct'
    ? 'var(--success-text)'
    : 'var(--danger-text)';

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
// Deliberately NOT automated with a timer. It would be easy to write
// `await delay(2000); nextQuestion();` after showing the feedback, but a
// fixed pause takes control away from anyone who reads slowly, uses a screen
// reader, or wants to sit and think about the explanation. Async tools should
// remove waiting, not impose it.
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
  // If the key is absent (user never visited the Learn page), default to Introductory.
  const isAdvanced   = getLevel() === 'advanced';
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

// ---------- DOWNLOAD CERTIFICATE ----------
// A small but genuine use of `await delay()` — and a different reason from
// the anti-flicker pauses above.
//
// window.print() is SYNCHRONOUS and BLOCKING: it opens the print dialog and
// stops JavaScript, rendering, and everything else until the user dismisses
// it. So setting the button text and immediately calling window.print() on
// the next line would be a race the button usually loses — the browser never
// gets a chance to paint "Preparing certificate…" before being frozen, and
// the user sees nothing happen until the dialog appears.
//
// `await delay(50)` yields control back to the browser for a moment. That is
// long enough for it to paint the updated label, after which blocking is
// harmless. This "yield so the browser can paint before blocking" trick is
// worth remembering — it applies to any long synchronous operation.
async function downloadCertificate() {
  const certBtn = document.getElementById('download-cert');

  if (certBtn) {
    certBtn.disabled = true;
    certBtn.setAttribute('aria-busy', 'true');
    certBtn.textContent = 'Preparing certificate…';
  }

  try {
    await delay(50); // let the browser paint the label above
    window.print();  // blocks here until the print dialog is dismissed
  } finally {
    // finally guarantees the button is restored even if print() throws
    // (some browsers and kiosk configurations block printing entirely).
    if (certBtn) {
      certBtn.disabled = false;
      certBtn.removeAttribute('aria-busy');
      certBtn.textContent = 'Download Certificate';
    }
  }
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
//
// This is the OLDER callback style of asynchronous code, kept here because it
// genuinely suits the job: a repeating tick with no result to return. Compare
// it with delay() in async-utils.js, which wraps the one-shot setTimeout in a
// Promise so it can be awaited. Promises represent a single eventual value, so
// they are a poor fit for something that fires over and over — a callback is
// the right tool for a recurring event.
function startTimer() {
  quizState.timeLeft = QUESTION_SECONDS[getLevel()];
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
// Called when the question's time (see QUESTION_SECONDS) expires without the
// user selecting an answer.
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
    const isAdvanced = getLevel() === 'advanced';
    levelNotice.innerHTML = isAdvanced
      ? '<span class="level-notice-badge level-notice-advanced">Advanced assessment</span> Questions are clause-referenced and test in-depth knowledge of IEC 62304:2006+AMD1:2015.'
      : '<span class="level-notice-badge level-notice-intro">Introductory assessment</span> Questions cover the core concepts of IEC 62304. Switch to Advanced on the <a href="learn.html">Learn page</a> for a more challenging assessment.';
  }

  // Same idea as the .js-question-count fill-in in startQuestionsLoad(), but
  // this one doesn't need to wait on the network — the level (and therefore
  // the time per question) is already known from localStorage.
  const secondsPerQuestion = QUESTION_SECONDS[getLevel()];
  document.querySelectorAll('.js-timer-seconds').forEach(function (el) {
    el.textContent = secondsPerQuestion;
  });

  document.getElementById('begin-quiz').addEventListener('click', startQuiz);
  document.getElementById('next-question').addEventListener('click', nextQuestion);
  document.getElementById('retry-quiz').addEventListener('click', resetQuiz);
  document.getElementById('download-cert').addEventListener('click', downloadCertificate);

  // RETRY — re-attempt a failed question load. This starts a genuinely new
  // request: the old Promise is permanently rejected and, once settled, a
  // Promise can never change state, so retrying means creating a new one.
  const retryBtn = document.getElementById('questions-retry');
  if (retryBtn) {
    retryBtn.addEventListener('click', function () {
      document.getElementById('questions-error').classList.add('hidden');
      startQuestionsLoad(); // replaces questionsPromise with a fresh attempt
      startQuiz();          // and immediately try to begin again
    });
  }

  // PREFETCH — start downloading the question set now, while the learner is
  // still reading the instructions and typing their name. Nothing awaits this
  // yet; startQuiz() awaits the stored Promise later.
  startQuestionsLoad();
});
