# Archive: the email signup and the photo slider

On 19 November 2026 the site stopped collecting email addresses. People now follow and message
Gabriel on Instagram, and nothing else. Everything that took emails was removed from the live site
and kept here so it can come back.

| Path | What it is |
| --- | --- |
| `pages/ai-home-with-email-signup-and-photo-slider.html` | The AI automation home page with its three signup forms, the weekly brief section (with the example phone screens) and the "Businesses I run myself." photo slider. |
| `pages/privacy-with-email-signup.html` | The privacy page written for an email list. |
| `code/subscribe.js` | The `/api/subscribe` handler that added people to Flodesk (was `api/subscribe.js`). |
| `code/signup.js`, `code/validate.js` | The browser form logic and the name and email rules shared with the server. |
| `code/mail.js` | The hidden contact email and the "Email me about a task" button. |
| `code/home.js` | The home page script that wired the forms and counted signups. |
| `tests/` | The Flodesk handoff tests, the validation tests, and the server tests that covered signup. |
| `.env.example` | The Flodesk settings the site used. |

## Putting it back

Copy `code/` files into `api/` and `public/assets/js/` under their old names, restore the `/api/subscribe`
route and the mock Flodesk helper in `server.mjs` (see the git tag `archive/side-hustle-dads-2026-11-19`
for the last version that had them), put the tests back in `test/`, and set `FLODESK_API_KEY` in Railway.
The photos used by the slider are still in `public/assets/img/` (`work-*.jpg`).
