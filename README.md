# gabrieldealmeida.com

A landing page and quiz for **Score My Side Hustle Idea**, a free side hustle scorecard.

Two ways in, and nothing else:

1. **The home page.** A visitor must enter a first name and email, no exceptions. That adds them to your Flodesk audience, and only then can they reach the quiz at `/test`. Anyone who opens `/test` without having signed up is sent back to the home page form.
2. **The ManyChat link.** `https://gabrieldealmeida.com/?from=ig` opens the home page for people who gave you their email in the Instagram DM. They see the whole page, and the signup form is replaced by a "Start the scorecard" button (every start button on the page does the same), so they are never asked again. `https://gabrieldealmeida.com/test?from=ig` still works and skips the home page entirely.

Once in, they answer 17 short screens (progress is saved on their device), see their verdict and five scores, and get the full breakdown, a Save as PDF button, and the printable worksheet.

```
public/                  the whole site (this is what gets served)
  index.html             home page
  test/                  the quiz page (the questions and scoring live in assets/js/scorecard.js)
  privacy/               privacy page
  downloads/             score-my-side-hustle-idea.pdf (built from pdf/)
  assets/js/scorecard.js every question, score, and verdict rule
  assets/js/quiz.js      the quiz screens and results
  assets/js/signup.js    the email form (validation, "did you mean", call to the server)
  assets/js/validate.js  name and email rules, shared by browser and server
api/subscribe.js         validates again, then adds the person to Flodesk
pdf/                     source for the scorecard PDF (HTML, printed by Chrome)
content/                 the scorecard's wording as plain text
server.mjs               the web server (what Railway runs, and the local preview)
railway.json             tells Railway how to start the site and check it is healthy
```

## Try it on your computer

```bash
npm run dev -- --mock-flodesk
```

Open http://localhost:8080. `--mock-flodesk` pretends to be Flodesk, so you can run the whole flow with no account. Signups print in the terminal and go nowhere else.

```bash
npm test          # validation, the Flodesk handoff, the scoring rules, and your brand rules
npm run build:pdf # rebuilds the PDF from pdf/score-my-side-hustle-idea.html (needs Chrome)
npm start         # runs the site the way Railway does
npm run check     # before going live: is the PDF there, is the Flodesk key set?
```

## Go live on Railway

The site is a plain Node server with no dependencies, so Railway needs no build step. It runs `npm start` and checks `/health` before sending visitors to a new version, which means a broken deploy won't replace a working one.

1. **Flodesk.** In Flodesk, create an API key (Account settings, then Integrations, then API keys; the menu names can differ a little). Then create a **segment** called "Score My Side Hustle Idea" and a **workflow** that starts when someone joins that segment and sends your welcome email (copy below). Turn the workflow on.
2. **Railway variables.** Open your service, go to **Variables**, and add:
   - `FLODESK_API_KEY` (your Flodesk API key, keep it secret). This is the only one that must be set. People are added straight to your Flodesk audience.
   - `FLODESK_SEGMENT_ID` (recommended). The id of the segment above. Every new signup is put on it, which is what starts the welcome workflow. To find it, run `curl -u YOUR_KEY: https://api.flodesk.com/v1/segments` in a terminal (note the colon after the key) and copy the `id` of your segment.
   - `FLODESK_WORKFLOW_ID` (optional). If you would rather start a workflow directly than through a segment, add its id here. Most people only need the segment.

   See `.env.example`. The site listens on port 8080 (or on Railway's `PORT`, if it sets one).
3. **Deploy.** Railway deploys when `master` changes. Watch the deploy logs. A good start prints `Site running on port ...`.
4. **Your domain.** If `gabrieldealmeida.com` is already attached to this Railway service, nothing changes. If not, add it under the service's Settings, then Networking.
5. **Test it for real.** Sign up on the live site with your own email, finish the quiz, and confirm you show up in Flodesk and get the welcome email. Then open `/test?reset=1` and try the `?from=ig` link.

If the form says "Signup is not connected yet," `FLODESK_API_KEY` is missing (or a segment or workflow id is set but isn't a plain id).

## ManyChat and Flodesk (Instagram DM to scorecard, plus a welcome email)

The keyword is **SCORE**. Set the trigger to "contains" so `score`, `Score`, and `SCORE please` all work. Put the same word in your bio and your pinned post.

Two links let people in without the home page form:

- `https://gabrieldealmeida.com/?from=ig` is the one for people from Instagram. (`/test?from=ig` goes straight to the scorecard if you ever want to skip the home page.)
- `https://gabrieldealmeida.com/?from=email` is the one in the welcome email. It opens the home page with a "Your scorecard is ready" button instead of the signup form, so people see the whole page and are never asked for their email again. It works on any phone or computer. (`/test?from=email` goes straight to the scorecard if you ever want to skip the home page.)

Neither carries a name or email, and the quiz removes the flag from the address bar after it loads.

### In Flodesk (about 15 minutes)

1. **Create a segment** called "Score My Side Hustle Idea". Everyone who signs up, from the website or from ManyChat, goes on it.
2. **Create a workflow** that starts when someone **joins that segment**, with one email (copy below). Flodesk adds the unsubscribe link and your address for you. Turn it on.
3. **Rebuild the welcome email in Flodesk's editor.** The HTML in `email/welcome.html` was made for the old email service and can't be pasted in. Use the same words, the same two links, and Flodesk's first-name personalization with "there" as the fallback.
4. **Check your sending domain.** In Flodesk's settings, verify the address or domain your emails send from, or they may land in spam.

### In ManyChat

ManyChat has no direct Flodesk step, so it sends the email to this site, and the site adds the person to Flodesk. After the step that collects the email, add an **External Request** action:

- **Request type:** POST
- **URL:** `https://gabrieldealmeida.com/api/subscribe`
- **Header:** `Content-Type` = `application/json`
- **Body (JSON):**

```
{"firstName": "{{first_name}}", "email": "{{email}}"}
```

Insert the first-name and email fields from ManyChat's field picker instead of typing the braces. Test it with your own email. If ManyChat's version of that action looks different, a Zapier or Make step from ManyChat to Flodesk does the same job.

### The DM flow (Instagram only lets a comment trigger one automatic reply until the person responds, so the first message ends with a button they tap)

1. **Trigger:** a comment on your reel containing the keyword, or a DM containing it.
2. **Public reply** (rotate these): "Sent! Check your DMs." / "Just sent it. Check your DMs 🙂" / "On its way. Look in your DMs."
3. **Message 1:** "Hey {{first_name}}! Glad you want to see if your side hustle idea is worth it 🙂" then "It's a quick scorecard that tells you if it will fit around your job. Takes about 5 minutes." Button: **Send it to me**. Set the first-name fallback to "there".
4. **Message 2:** "Drop your email below 👇 and I'll email you the scorecard." Collect it with ManyChat's email question, which checks the format.
5. **If the email isn't valid:** "Hmm, that doesn't look like an email. Mind trying once more? 👇"
6. **When they send a valid email:** the External Request step runs, then three short messages. First: "Got it, thank you!" Second: "I'm emailing your scorecard now. It should land in your inbox in a minute or two. If you don't see it, check your spam or promotions folder." Third: "Keep your job. Start a side hustle." followed by "P.S. I might send a short email now and then. Unsubscribe anytime." Optional but recommended: put a backup button on the second message, **Score my idea**, that opens the `?from=ig` link, in case the email is slow.
7. **If they go quiet** (about 1 hour): "Hey, still there? 🙂" then "If you still want the scorecard, drop your email below and I'll email it right over 👇"
8. **Optional last nudge** (about 20 hours, before Instagram's 24-hour window closes): "Last note from me, {{first_name}}. I don't want to clutter your DMs." then "If you still want the scorecard, drop your email here any time and I'll email it to you. If not, no worries at all."

Only turn this flow on once the Flodesk welcome workflow is live and you've tested it with your own email, since the messages promise an email.

### The welcome email

**Subject:** Your scorecard is ready

```
Hey {first name, fallback "there"},

Thanks for asking for Score My Side Hustle Idea. Here's the link whenever you're ready:

https://gabrieldealmeida.com/?from=email

It takes about 5 minutes. Pick one idea, answer honestly, and you'll get a verdict and a next step.

Most of my side hustles failed. The ones that worked already had buyers, a door already open, and fit around my job. This scorecard checks for exactly that.

Hit reply and tell me which idea you're scoring. I'd like to know.

Keep your job. Start a side hustle.

Gabriel
```

## Testing both ways in

The quiz remembers things on the device (saved answers, and whether this person already got in). So once a browser has signed up or used the ManyChat link, it stops asking. To test again, open:

```
http://localhost:8080/test?reset=1
```

That clears what the browser remembers and sends you to the home page form. From there you can test the signup path, or open `/test?from=ig` to test the ManyChat side door.

## Good to know

- **Signups are sent to Flodesk without asking for a confirmation email.** The form says clearly that you'll send emails, which is what covers consent. If you'd rather use double opt-in later, that's a change in this code and in Flodesk's settings.
- **The sign-up is a soft gate, not a lock.** It runs in the visitor's browser, so someone determined could get around it. That's normal for a free resource, and it's why the ManyChat link is open to anyone who has it. The worksheet PDF at `/downloads/score-my-side-hustle-idea.pdf` also opens for anyone with the link, and `robots.txt` keeps it out of search.
- **Answers stay on the visitor's device** (browser local storage). Only the name and email go anywhere, to Flodesk.
- **Nothing is cached without asking.** Pages, styles, scripts, images and the PDF are re-checked on every visit (a cheap 304 when unchanged), so a deploy never leaves a visitor with a new page and an old stylesheet. Only the font is cached for a year. Keep it that way: giving styles or scripts a max-age brings back half-styled pages after every deploy.
- **The quiz and the printable PDF share the same rules.** If you change a question or a verdict rule, change `scorecard.js` and `pdf/score-my-side-hustle-idea.html` together, then run `npm test` and `npm run build:pdf`.
- **Analytics: Plausible, no cookies.** The site loads Plausible and sends only event names and plain labels (never a name, an email or an answer). To turn it on: create a Plausible account, add the site `gabrieldealmeida.com`, then add these custom event goals so they show up: `Arrival`, `CTA Click`, `Section Seen`, `Signup`, `Quiz Opened`, `Quiz Started`, `Quiz Test`, `Quiz Finished`, `Result Action`, `Interest`. Until the account exists the calls do nothing. The privacy page already describes it.
- **The contact email is hidden on purpose.** The footer shows an "Email me" button that writes the address into the page when tapped (`public/assets/js/mail.js`), so scrapers do not collect it. With scripts off it shows `hello [at] gabrieldealmeida [dot] com`.
- **The demand test.** The results page asks which of four things would help most next (a course, a community, an idea review, nothing). It sends only the choice, as the `Interest` event, once per device.
- **Brand colors and type** live at the top of `public/assets/css/site.css` (Midnight, Graphite, Paper, Amber, Inter).
- **The old site** (Express, Pug, MongoDB) is untouched on the `master` branch.

## The look, and trying other looks

The live look is set by the `data-*` attributes on `<html>` on every page and by
`public/assets/css/theme.css`: Espresso & brass colours, Newsreader headlines, Source Sans 3 text and
the cut-out portrait. `public/assets/js/theme.js` does the small bits of scripting.

To try other fonts, palettes and corner styles without editing code, add `?looks=1` to any address,
for example `http://localhost:8080/?looks=1`. A **Looks** button appears (bottom left) and remembers
your picks in that browser only. `?looks=0` turns it off again. Visitors never see it. The panel's files
are `public/assets/css/looks.css` and `public/assets/js/looks.js`. To make a new look the live one,
copy its palette block from `looks.css` into `theme.css` and update the `data-*` attributes.
