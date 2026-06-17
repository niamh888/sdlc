// ============================================================
// contact.js  —  Contact page: real-time validation, form submission
// ============================================================

// ---------- VALIDATORS ----------
// Each validator is a pure function: takes a string, returns an error message
// or an empty string if the value is valid. Keeping logic here (separate from
// DOM interaction) means you can test or reuse these without touching the page.

function validateName(value) {
  if (!value) return 'Please enter your name.';
  if (value.length < 2) return 'Name must be at least 2 characters.';
  return '';
}

function validateEmail(value) {
  if (!value) return 'Please enter your email address.';
  // A regular expression pattern. ^ and $ anchor to start/end of string.
  // [^\s@]+ means "one or more characters that are not whitespace or @".
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(value)) return 'Please enter a valid email address.';
  return '';
}

function validateMessage(value) {
  if (!value) return 'Please enter a message.';
  if (value.length < 10) return 'Message must be at least 10 characters.';
  return '';
}

// ---------- SHOW / CLEAR FIELD ERROR ----------
// Adds the red border and error text for one field, or clears it.
// Returns true if valid (no error), false if invalid — used by the submit handler.
function showFieldError(fieldId, errorId, message) {
  const field = document.getElementById(fieldId);
  const errorEl = document.getElementById(errorId);

  if (message) {
    field.classList.add('error');       // red border via CSS
    errorEl.textContent = message;
  } else {
    field.classList.remove('error');
    errorEl.textContent = '';
  }

  return !message; // true = valid, false = invalid
}

// Combines getting the value, running the validator, and showing the result.
function validateField(fieldId, errorId, validatorFn) {
  const field = document.getElementById(fieldId);
  const message = validatorFn(field.value.trim()); // trim() removes leading/trailing spaces
  return showFieldError(fieldId, errorId, message);
}

// ---------- INIT ----------
document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('contact-form');
  const successPanel = document.getElementById('form-success');

  // BLUR VALIDATION — fires when the user leaves a field (clicks away).
  // Validating on blur rather than on every keystroke gives the user a chance
  // to finish typing before seeing an error.
  document.getElementById('name').addEventListener('blur', function () {
    validateField('name', 'name-error', validateName);
  });

  document.getElementById('email').addEventListener('blur', function () {
    validateField('email', 'email-error', validateEmail);
  });

  document.getElementById('message').addEventListener('blur', function () {
    validateField('message', 'message-error', validateMessage);
  });

  // SUBMIT — e.preventDefault() stops the browser from sending the form to a
  // server and reloading the page. All processing happens in JavaScript instead.
  form.addEventListener('submit', function (e) {
    e.preventDefault();

    // Validate all required fields. Each call returns true/false.
    // All three run even if the first fails, so every error shows at once.
    const nameValid    = validateField('name',    'name-error',    validateName);
    const emailValid   = validateField('email',   'email-error',   validateEmail);
    const messageValid = validateField('message', 'message-error', validateMessage);

    // Only proceed if everything passed.
    if (!nameValid || !emailValid || !messageValid) return;

    // Hide the form and show the success message in its place.
    form.classList.add('hidden');
    successPanel.classList.remove('hidden');
  });

  // SEND ANOTHER — resets the form back to its empty state.
  document.getElementById('send-another').addEventListener('click', function () {
    form.reset(); // clears all field values

    // Clear any leftover error styles from the previous attempt.
    document.querySelectorAll('.field-error').forEach(function (el) { el.textContent = ''; });
    document.querySelectorAll('.error').forEach(function (el) { el.classList.remove('error'); });

    successPanel.classList.add('hidden');
    form.classList.remove('hidden');
  });
});
