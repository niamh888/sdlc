function validateName(value) {
  if (!value) return 'Please enter your name.';
  if (value.length < 2) return 'Name must be at least 2 characters.';
  return '';
}

function validateEmail(value) {
  if (!value) return 'Please enter your email address.';
  var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(value)) return 'Please enter a valid email address.';
  return '';
}

function validateMessage(value) {
  if (!value) return 'Please enter a message.';
  if (value.length < 10) return 'Message must be at least 10 characters.';
  return '';
}

function showFieldError(fieldId, errorId, message) {
  var field = document.getElementById(fieldId);
  var errorEl = document.getElementById(errorId);

  if (message) {
    field.classList.add('error');
    errorEl.textContent = message;
  } else {
    field.classList.remove('error');
    errorEl.textContent = '';
  }

  return !message;
}

function validateField(fieldId, errorId, validatorFn) {
  var field = document.getElementById(fieldId);
  var message = validatorFn(field.value.trim());
  return showFieldError(fieldId, errorId, message);
}

document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('contact-form');
  var successPanel = document.getElementById('form-success');
  var sendAnother = document.getElementById('send-another');

  document.getElementById('name').addEventListener('blur', function () {
    validateField('name', 'name-error', validateName);
  });

  document.getElementById('email').addEventListener('blur', function () {
    validateField('email', 'email-error', validateEmail);
  });

  document.getElementById('message').addEventListener('blur', function () {
    validateField('message', 'message-error', validateMessage);
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var nameValid = validateField('name', 'name-error', validateName);
    var emailValid = validateField('email', 'email-error', validateEmail);
    var messageValid = validateField('message', 'message-error', validateMessage);

    if (!nameValid || !emailValid || !messageValid) return;

    form.classList.add('hidden');
    successPanel.classList.remove('hidden');
  });

  sendAnother.addEventListener('click', function () {
    form.reset();

    document.querySelectorAll('.field-error').forEach(function (el) { el.textContent = ''; });
    document.querySelectorAll('.error').forEach(function (el) { el.classList.remove('error'); });

    successPanel.classList.add('hidden');
    form.classList.remove('hidden');
  });
});
