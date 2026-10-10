# gabrieldealmeida.com

A landing page and quiz for **Score My Side Hustle Idea**, a free side hustle scorecard.

Two ways in, and nothing else:

1. **The home page.** A visitor must enter a first name and email, no exceptions. That adds them to your Kit list, and only then can they reach the quiz at `/test`. Anyone who opens `/test` without having signed up is sent back to the home page form.
2. **The ManyChat link.** `https://gabrieldealmeida.com/test?from=ig` is the side door for people who gave you their email in the Instagram DM. They go straight in without being asked again.

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
api/subscribe.js         validates again, then adds the person to Kit
pdf/                     source for the scorecard PDF (HTML, printed by Chrome)
content/                 the scorecard's wording as plain text
dev-server.mjs           local preview
```

## Try it on your computer

```bash
npm run dev -- --mock-kit
```

Open http://localhost:3000. `--mock-kit` pretends to be Kit, so you can run the whole flow with no account. Signups print in the terminal and go nowhere else.

```bash
npm test          # validation, the Kit handoff, the scoring rules, and your brand rules
npm run build:pdf # rebuilds the PDF from pdf/score-my-side-hustle-idea.html (needs Chrome)
npm run check     # before going live: is the PDF there, are the Kit settings set?
```

## Go live (about 20 minutes)

1. **Kit.** Create a free account. Make a form (Grow, then Landing Pages & Forms, then a new form). The form's number is at the end of its address, for example `.../forms/1234567/...`. Then create an API key under Settings, then Developer.
2. **The PDF.** It's already built at `public/downloads/score-my-side-hustle-idea.pdf`. To change the wording, edit `pdf/score-my-side-hustle-idea.html` and run `npm run build:pdf`.
3. **Vercel.** Import this GitHub repository at vercel.com (the free plan is enough). Leave the framework as "Other". Under Settings, then Environment Variables, add `KIT_API_KEY` and `KIT_FORM_ID` (see `.env.example`).
4. **Your domain.** In Vercel, add `gabrieldealmeida.com` under Domains and follow its DNS instructions.
5. **Test it for real.** Sign up on the live site with your own email, finish the quiz, and confirm you show up in Kit. Then open `/test?reset=1` and try the `?from=ig` link.

## ManyChat (Instagram comment or DM to the scorecard)

The keyword is **SCORE**. Set the trigger to "contains" so `score`, `Score`, and `SCORE please` all work. Put the same word in your caption, your bio line, and your pinned post.

The link to send in the DM is:

```
https://gabrieldealmeida.com/test?from=ig
```

That link tells the quiz the person already gave their email in Instagram, so it lets them in without the home page form. It carries no name or email, and the quiz removes the flag from the address bar after it loads.

**The flow** (Instagram only lets a comment trigger one automatic reply until the person responds, so the first message ends with a button they tap):

1. **Trigger:** a comment on your reel containing the keyword, or a DM containing it.
2. **Public reply** (rotate these): "Sent! Check your DMs." / "Just sent it. Check your DMs 🙂" / "On its way. Look in your DMs."
3. **Message 1:** "Hey {{first_name}}! Glad you want to score your side hustle idea 🙂" then "It's a quick scorecard that tells you if it will fit around your job. Takes about 5 minutes." Button: **Send it to me**. Set the first-name fallback to "there".
4. **Message 2:** "Drop your email below 👇 and I'll send the scorecard right here in the chat." Collect it with ManyChat's email question, which checks the format.
5. **If the email isn't valid:** "Hmm, that doesn't look like an email. Mind trying once more? 👇"
6. **When they send a valid email:** "Got it, thank you!" then "Here's your scorecard. Score one idea at a time, and be honest with every answer." Button: **Score my idea** (opens the link above). Then one more message: "Keep your job. Start a side hustle." followed by "P.S. I might send a short email now and then. Unsubscribe anytime."
7. **If they go quiet** (about 1 hour): "Hey, still there? 🙂" then "If you still want the scorecard, drop your email below and I'll send it right over 👇"
8. **Optional last nudge** (about 20 hours, before Instagram's 24-hour window closes): "Last note from me, {{first_name}}. I don't want to clutter your DMs." then "If you still want the scorecard, drop your email here any time. If not, no worries at all."

The scorecard link goes in the DM, not by email. Nothing in this setup sends email yet, so don't promise one.

**Getting those emails into Kit.** ManyChat's connection to Kit probably needs a paid ManyChat plan (check their pricing page). Until you connect them, export the emails from ManyChat and import them into Kit.

## Testing both ways in

The quiz remembers things on the device (saved answers, and whether this person already got in). So once a browser has signed up or used the ManyChat link, it stops asking. To test again, open:

```
http://localhost:3000/test?reset=1
```

That clears what the browser remembers and sends you to the home page form. From there you can test the signup path, or open `/test?from=ig` to test the ManyChat side door.

## Good to know

- **Signups come in as active subscribers, with no confirmation email.** The form says clearly that you'll send emails, which is what covers consent. If you'd rather use double opt-in later, that's a setting on the Kit side.
- **The sign-up is a soft gate, not a lock.** It runs in the visitor's browser, so someone determined could get around it. That's normal for a free resource, and it's why the ManyChat link is open to anyone who has it. The worksheet PDF at `/downloads/score-my-side-hustle-idea.pdf` also opens for anyone with the link, and `robots.txt` keeps it out of search.
- **Answers stay on the visitor's device** (browser local storage). Only the name and email go anywhere, to Kit.
- **The quiz and the printable PDF share the same rules.** If you change a question or a verdict rule, change `scorecard.js` and `pdf/score-my-side-hustle-idea.html` together, then run `npm test` and `npm run build:pdf`.
- **No analytics or cookies.** The privacy page says so. If you add analytics, update `public/privacy/index.html` the same day.
- **Brand colors and type** live at the top of `public/assets/css/site.css` (Midnight, Graphite, Paper, Amber, Inter).
- **The old site** (Express, Pug, MongoDB) is untouched on the `master` branch.
