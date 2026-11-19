# gabrieldealmeida.com

Gabriel De Almeida's site: practical AI automation for businesses that want to bring AI into how they work.

One page does the job, and it asks for one thing: **follow and message Gabriel on Instagram.** The site has no forms, no email signup and no database. It collects nothing about visitors.

The site used to be Side Hustle Dads with the Score My Side Hustle Idea quiz, and for a short time it also had an email signup and a photo slider. All of that is kept in [`archive/`](archive/side-hustle-dads/README.md), and the old site is also the git tag `archive/side-hustle-dads-2026-11-19`.

```
public/                   the whole site (this is what gets served)
  index.html              the home page: hero, problem, how AI projects fail, the Automation Ladder,
                          what I build, rules, story, the honest "no" section, four tests,
                          message me, FAQ
  privacy/                privacy page
  404.html                page not found
  assets/css/             site.css (components), theme.css (the look), automation.css (this page)
  assets/js/home.js       the phone button and plain click counts
archive/                  the old site and the removed email signup, kept safe and reusable
server.mjs                the web server (what Railway runs, and the local preview)
railway.json              tells Railway how to start the site and check it is healthy
```

## Try it on your computer

```bash
npm run dev
```

Open http://localhost:8080.

```bash
npm test          # the server, and your brand rules
npm start         # runs the site the way Railway does
npm run check     # before going live: is the share image there?
```

## Go live on Railway

The site is a plain Node server with no dependencies and no settings, so Railway needs no build step and no variables. It runs `npm start` and checks `/health` before sending visitors to a new version, which means a broken deploy won't replace a working one.

1. **Deploy.** Railway deploys when `master` changes. Watch the deploy logs. A good start prints `Site running on port ...`.
2. **Your domain.** If `gabrieldealmeida.com` is already attached to this Railway service, nothing changes.
3. **Test it for real.** Open the live site, tap **Message me on Instagram** on your phone and check that your DM with yourself opens, then check **Follow**.

## Links in the wild

- Every button goes to Instagram: **Follow** opens `https://www.instagram.com/itsgabrieldealmeida/` and **Message me** opens `https://ig.me/m/itsgabrieldealmeida`.
- `https://gabrieldealmeida.com/?from=ig` (Instagram), `?from=tiktok` and `?from=youtube` all open the home page and are counted as arrivals by source. Nothing about the person is in the link.
- The retired quiz address `/test` sends people to the home page and keeps `?from=`.
- Still outside this repo, and worth updating: the Flodesk segment and workflow from the old site (they no longer receive signups), the ManyChat SCORE flow that promises the scorecard, and any bio that says "Keep your job. Start a side hustle."

## Good to know

- **Nothing is cached without asking.** Pages, styles, scripts and images are re-checked on every visit (a cheap 304 when unchanged), so a deploy never leaves a visitor with a new page and an old stylesheet. Only fonts are cached for a year. Keep it that way: giving styles or scripts a max-age brings back half-styled pages after every deploy.
- **Analytics: our own Plausible, no cookies.** The pages load Plausible from our own server on Railway (`PLAUSIBLE_ORIGIN` in `server.mjs`, which also sets the security policy that lets it through). It counts visits and outbound link clicks on its own, and the site adds a few custom events with plain labels only. Register these as custom event goals in the Plausible dashboard: `Arrival`, `CTA Click`, `Section Seen`. The script is deliberately the version without the `hash` extension: this page's anchor links would each be counted as a new page view. `Outbound Link: Click` shows how many people tapped through to Instagram.
- **No email, anywhere.** There is no contact address on the site and no form. `test/brand.test.js` fails the build if a form, an email field, a mailto link or a newsletter mention appears.
- **Every example on the page is an illustration.** The footer says so, the brand tests check for it, and the tests also block promises of savings, time or income. Keep any new example framed the same way.
- **Your voice rules are tests.** `test/brand.test.js` fails the build on dashes, guru and hype words, company names, income or savings numbers and old names. Run `npm test` after any copy change.
- **The work photos** (`public/assets/img/work-*.jpg`) are not on the page right now. They are kept for reuse.

## The look

The live look is set by the `data-*` attributes on `<html>` on every page and by `public/assets/css/theme.css`: Espresso and brass colours, Newsreader headlines, Source Sans 3 text and the cut-out portrait. `public/assets/css/automation.css` holds the parts that are specific to this page and uses only the palette variables, so a palette change reaches it too.

To try other fonts, palettes and corner styles without editing code, add `?looks=1` to any address, for example `http://localhost:8080/?looks=1`. A **Looks** button appears (bottom left) and remembers your picks in that browser only. `?looks=0` turns it off again. Visitors never see it. To make a new look the live one, copy its palette block from `public/assets/css/looks.css` into `theme.css` and update the `data-*` attributes.
