# Archive: the Side Hustle Dads site

The site as it stood on **19 November 2026**, before gabrieldealmeida.com switched to AI automation.
Nothing in this folder is served by the website (the server only serves `public/`) and `npm test`
only runs `test/`, so it sits here safely until you want something back.

## Three layers of safety

1. **The git tag `archive/side-hustle-dads-2026-11-19`** is the whole repo exactly as it was: every page,
   script, image, test and the PDF. Nothing else can change it. See "Putting it all back" below.
2. **This folder** is the reusable part, in plain files you can open without git.
3. **Your own copy of the repo history** on GitHub, once the tag is pushed (`git push origin archive/side-hustle-dads-2026-11-19`).

## What is here

| Path | What it is |
| --- | --- |
| `site-copy.md` | Every word on the home page, privacy page and 404, section by section, plus the facts and voice rules. Start here when you want to reuse wording. |
| `pages/` | The four HTML pages as they were: home, quiz (`test/`), privacy, 404. They still use `public/assets/css/site.css` and `theme.css`, which kept every old component. |
| `scorecard/` | The Score My Side Hustle Idea quiz: its scripts (`js/`), the full wording (`score-my-side-hustle-idea.md`), the printable worksheet source (`pdf/`) and the built PDF (`downloads/`). |
| `email/welcome.html` | The old welcome email. Flodesk needs it rebuilt in its own editor, so use it as wording only. |
| `tests/` | The scorecard tests, the entry-link tests and the brand rules test as they were. |
| `assets/img/` | The pictures only the old site used: the Side Hustle Dads icon, the Skool logo, the old share images and two older portraits. |

Pictures the new site still uses (the portrait cut-out, door photo, family photo, event and video photos)
stay in `public/assets/img/`.

## Putting it all back

To look at the old site next to the new one without touching anything:

```bash
git worktree add ../gabrieldealmeida.com-old archive/side-hustle-dads-2026-11-19
cd ../gabrieldealmeida.com-old && npm run dev -- --mock-flodesk
```

To bring the quiz back into this repo, copy `scorecard/js/*` into `public/assets/js/`,
`pages/test/index.html` into `public/test/`, `scorecard/pdf/` into `pdf/`, `scorecard/downloads/` into
`public/downloads/`, the tests into `test/`, and restore the `/test` route in `server.mjs`.

## Things outside this repo that still point at the old site

These live in other tools, so nothing here can change them. Update them when you are ready:

- **Flodesk:** the segment and workflow named "Score My Side Hustle Idea" still send the scorecard welcome email. Point `FLODESK_SEGMENT_ID` at a new segment before sending new signups anywhere.
- **ManyChat:** the SCORE keyword flow and its `?from=ig` link now land on the new home page.
- **Skool:** the Side Hustle Dads community (https://www.skool.com/side-hustle-dads-4194) is untouched, but the website no longer links to it.
- **Instagram, TikTok, YouTube bios:** any that say "Keep your job. Start a side hustle."
