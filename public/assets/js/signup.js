import { validateName, validateEmail, suggestEmail, validateSignup } from './validate.js';

const TIMEOUT_MS = 15000;

// Wires up a signup form: validation as you type, the "did you mean" nudge,
// the call to /api/subscribe, and honest error messages. When a signup
// succeeds it calls onSuccess({ firstName, email }) and leaves the page alone.
export function initSignupForm(form, { onSuccess } = {}) {
  const $ = (id) => form.querySelector(`#${id}`);
  const fields = {
    firstName: { input: form.elements.firstName, error: $('firstName-error'), validate: validateName },
    email: { input: form.elements.email, error: $('email-error'), validate: validateEmail },
  };
  const hint = $('email-hint');
  const suggestionButton = $('email-suggestion');
  const status = $('form-status');
  const submit = $('submit');
  const label = submit.querySelector('.btn-label');
  const idleLabel = label.textContent;

  let busy = false;
  // The email we already offered a correction for. Once offered, a second
  // submit of the same address goes through as typed.
  let offeredFor = null;

  function showError(name, message) {
    const { input, error } = fields[name];
    error.textContent = message;
    error.hidden = false;
    input.setAttribute('aria-invalid', 'true');
  }

  function clearError(name) {
    const { input, error } = fields[name];
    error.hidden = true;
    error.textContent = '';
    input.removeAttribute('aria-invalid');
  }

  function showStatus(message) {
    status.textContent = message;
    status.hidden = false;
  }

  function hideStatus() {
    status.hidden = true;
    status.textContent = '';
  }

  function showSuggestion(address) {
    suggestionButton.textContent = address;
    suggestionButton.dataset.address = address;
    hint.hidden = false;
  }

  function hideSuggestion() {
    hint.hidden = true;
    suggestionButton.textContent = '';
    delete suggestionButton.dataset.address;
  }

  function setBusy(on) {
    busy = on;
    submit.disabled = on;
    submit.setAttribute('aria-busy', String(on));
    label.textContent = on ? 'Sending…' : idleLabel;
  }

  for (const [name, field] of Object.entries(fields)) {
    // Check a field when the person leaves it, but only if they typed something,
    // so tabbing through an empty form does not shout at them.
    field.input.addEventListener('blur', () => {
      if (!field.input.value.trim()) return;
      const result = field.validate(field.input.value);
      if (result.ok) {
        clearError(name);
        if (name === 'email') {
          const suggestion = suggestEmail(field.input.value);
          if (suggestion) showSuggestion(suggestion);
        }
      } else {
        showError(name, result.message);
      }
    });

    // Once a field is showing an error, clear it the moment it becomes valid.
    field.input.addEventListener('input', () => {
      hideStatus();
      if (name === 'email') {
        hideSuggestion();
        offeredFor = null;
      }
      if (!field.input.hasAttribute('aria-invalid')) return;
      if (field.validate(field.input.value).ok) clearError(name);
    });
  }

  suggestionButton.addEventListener('click', () => {
    const address = suggestionButton.dataset.address;
    if (!address) return;
    fields.email.input.value = address;
    clearError('email');
    hideSuggestion();
    offeredFor = null;
    submit.focus();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) return;
    hideStatus();

    const raw = {
      firstName: fields.firstName.input.value,
      email: fields.email.input.value,
    };
    const checked = validateSignup(raw);

    clearError('firstName');
    clearError('email');
    if (!checked.ok) {
      for (const [name, message] of Object.entries(checked.errors)) showError(name, message);
      const first = checked.errors.firstName ? 'firstName' : 'email';
      fields[first].input.focus();
      return;
    }

    const { firstName, email } = checked.value;
    const suggestion = suggestEmail(email);
    if (suggestion && offeredFor !== email) {
      offeredFor = email;
      showSuggestion(suggestion);
      suggestionButton.focus();
      return;
    }

    setBusy(true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          firstName,
          email,
          hp: form.elements.hp.value,
          referrer: window.location.href,
        }),
        signal: controller.signal,
      });

      let data = null;
      try {
        data = await response.json();
      } catch {
        // A non-JSON reply falls through to the generic message below.
      }

      if (response.ok && data?.ok) {
        setBusy(false);
        onSuccess?.({ firstName, email });
        return;
      }

      setBusy(false);
      if (response.status === 422 && data?.errors) {
        for (const [name, message] of Object.entries(data.errors)) {
          if (fields[name]) showError(name, message);
        }
        const first = data.errors.firstName ? 'firstName' : 'email';
        fields[first].input.focus();
        return;
      }
      showStatus(data?.message || 'Something went wrong. Please try again in a minute.');
    } catch (err) {
      setBusy(false);
      showStatus(
        err.name === 'AbortError'
          ? 'That took too long. Check your connection and try again.'
          : 'We could not connect. Check your internet and try again.',
      );
    } finally {
      clearTimeout(timer);
    }
  });

  // Coming back with the browser's back button should not leave a stuck button.
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) setBusy(false);
  });
}
