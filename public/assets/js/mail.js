// Shows the contact email only when someone taps "Email me". The address is never
// written out in the page, so it is hard for scrapers to collect and spam.

const parts = { u: 'aGVsbG8=', d: 'Z2FicmllbGRlYWxtZWlkYS5jb20=' }; // the two halves, encoded

document.addEventListener('click', (event) => {
  const button = event.target.closest('.reveal-mail');
  if (!button) return;
  const address = `${atob(parts.u)}@${atob(parts.d)}`;
  const link = document.createElement('a');
  link.href = `mailto:${address}`;
  link.textContent = address;
  button.replaceWith(link);
});
