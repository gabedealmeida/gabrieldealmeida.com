// Shows the contact email only when someone taps "Email me". The address is never
// written out in the page, so it is hard for scrapers to collect and spam.
//
// A plain .reveal-mail button turns into the address as a link. A button that also has
// data-open opens the visitor's mail app straight away (with data-subject as the subject
// line) and still leaves the address on the page, in case they use webmail.

const parts = { u: 'aGVsbG8=', d: 'Z2FicmllbGRlYWxtZWlkYS5jb20=' }; // the two halves, encoded

document.addEventListener('click', (event) => {
  const button = event.target.closest('.reveal-mail');
  if (!button) return;
  const address = `${atob(parts.u)}@${atob(parts.d)}`;
  const subject = button.dataset.subject ? `?subject=${encodeURIComponent(button.dataset.subject)}` : '';
  const link = document.createElement('a');
  link.href = `mailto:${address}${subject}`;
  link.textContent = address;
  // Keep the look of the button the visitor tapped (everything except the reveal class).
  link.className = button.className.replace('reveal-mail', '').trim();
  if (button.dataset.cta) link.dataset.cta = button.dataset.cta;
  button.replaceWith(link);
  if (button.hasAttribute('data-open')) window.location.href = link.href;
});
