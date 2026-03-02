

```markdown
# CrownTALK 👑 — User Manual

CrownTALK is a tool that helps you write **short, professional replies** to X (Twitter) posts in seconds, with a focus on crypto / Web3 content.

You paste tweet links, choose a few options (tone, language, quality), and CrownTALK returns ready-to-use replies you can post with minimal editing.

---

## 1. Access & Login

CrownTALK is gated — you need an access code.

1. Open the CrownTALK app (e.g. `https://crowntalkv2.netlify.app`).
2. On the first visit:
   - Enter your **access code**.
   - Provide your **X profile link** and set a password.
   - This creates your account.
3. On later visits:
   - Use the same access code.
   - Log in with your X profile and password.

Your session is stored locally so you stay logged in on that device until you log out or clear storage.

---

## 2. Core Workflow

### Step 1 — Paste tweet URLs

At the top, there’s a box to paste X links.

- Paste one or more tweet URLs (e.g. `https://x.com/user/status/123...`).
- CrownTALK automatically:
  - detects valid URLs
  - counts how many are valid vs invalid
  - lists each URL in the inbox

You can:

- remove any URL from the list,
- change the list and run again,
- run a single URL or multiple at once.

> You’ll usually batch tweets by topic (e.g. “today’s threads I want to reply to”).

---

### Step 2 — Configure controls

Under the URL list you’ll see **controls**. These tell CrownTALK how to write.

#### Language

- **English only** — replies in English.
- **Native language mode** — replies can be generated in a native language, with internal handling to keep copy/copy-history sane. (Internally, the system may still use English for some validation steps.)

If Native mode is set to `auto`, CrownTALK can choose language based on the tweet or your settings.

#### Tone

Examples:

- Neutral / Professional
- Optimistic
- Skeptical
- Cautious

CrownTALK always avoids emojis, hashtags, and degen / cringe slang. Tone mainly affects whether you sound slightly more optimistic or reserved.

#### Intent

CrownTALK classifies tweets into different **intent modes**, such as:

- General reply
- Answering a question
- Responding to metrics / stats posts
- Reacting to announcements
- GM / greeting posts
- Opinion / take replies

In many cases, this is automatic; some layouts allow you to override.

#### Quality mode

- **Fast** — minimal tokens, fastest; good for low-stakes replies.
- **Balanced** — default; best trade-off between speed and quality.
- **Pro** — more context and slightly longer replies, still short and CT-friendly.

Even in `pro` mode, comments are kept short and punchy.

---

### Step 3 — Run the pipeline

Click **Generate**.

You’ll see a **pipeline** with stages:

1. **Fetching** — grabs tweet data and context.
2. **Generating** — LLM generates candidate replies.
3. **Polishing** — quality checks, formatting, and cleanup.
4. **Finalizing** — results are stored and displayed.

A progress indicator shows:

- Overall bar: how far the run has progressed.
- Queue counter: `Queue 1/4`, `2/4`, … as each URL is completed.

You can cancel mid-run:

- The UI stops waiting and frees the controls.
- The backend best-effort cancels any further work on that run.

---

## 3. Reading your results

When the run finishes you will see **result cards** — one per tweet.

Each card includes:

- The tweet’s URL (and in some views, a small preview).
- Project info (when available).
- Two main comments (plus alternates if you enabled them).
- Small **badges** describing the comment.

### Example badge meanings

- **FACT-SAFE** — comment uses numbers or concrete statements without obvious risky phrasing.
- **LOW HYPE** — comment uses cautious / hedged language and avoids hype / degen slang.
- **NATIVE TONE** — comment is in your configured native language.

Not every comment will show badges — they appear only when the heuristics find something relevant.

### Comment-level actions

On each comment you can:

- **Copy** — one-click copy to clipboard.
- **Edit** — tweak wording before posting.
- **Reroll** — regenerate comments for that tweet (using current settings).

---

## 4. GM / Greeting Behavior

CrownTALK has a dedicated **GM mode** for greeting-style tweets:

- Tweets containing things like `gm`, `good morning`, `happy Friday`, `happy weekend`, certain holidays, and birthdays are treated as **greeting** tweets.
- In greeting mode, CrownTALK always returns **two comments**:

  1. **Comment 1** — pure greeting, no question.  
     Example:  
     `GM Wale, hope you're off to a solid start today.`

  2. **Comment 2** — greeting plus exactly **one** question focused on what’s coming (alpha, roadmap, updates).  
     Example:  
     `GM Wale, what kind of alpha can we expect on Monday?`

### How the name is chosen

CrownTALK picks a **short name** for the greeting:

1. Prefer the author’s **display name**.
2. Otherwise, use the `@handle` (without `@`).
3. Otherwise, fall back to `"there"`.

It then shortens:

- Take the first word.
- If it’s longer than 8 characters, trim to the first 4.
- Capitalize the first letter.

Example:

- Display name: `Waleswoosh`
- Short name: `Wale`
- Greeting: `GM Wale, ...`

### Additional GM rules

- Comments are kept **very short**:
  - Roughly 12–22 words.
  - At most 2 short sentences.
- Only one `?` is allowed in the comment that asks a question.
- No emojis, no hashtags, no cringe slang.
- Punctuation and spacing are normalized so GM replies look tidy and professional.

You don’t need to configure anything for GM — it triggers automatically when the tweet looks like a greeting.

---

## 5. History & Clipboard

### Run history

CrownTALK stores run history per browser/device, so you can:

- See previous runs.
- Review which URLs you generated for.
- Re-open past results.

Advanced users can also export server-side history via API endpoints (if exposed).

### Clipboard history

Every time you click **Copy**:

- The comment may be stored in a **Clipboard history** view.
- You can export these in formats like TXT or CSV (depending on your configuration).
- Useful for building tweet queues or saving your favorite lines.

---

## 6. Good usage patterns

- **Batch by theme**  
  Run related tweets (same project / narrative) together; it’s easier to scan and post.

- **Use Balanced or Pro for important replies**  
  For important announcements or high-visibility accounts, use `balanced` or `pro`.

- **Always sanity-check facts**  
  Even with fact-safe heuristics, double-check concrete numbers before posting.

- **Edit lightly for your voice**  
  Treat CrownTALK as a “first draft” — a lot of the time you can post as-is, but a small edit helps match your personal style.

---

## 7. Troubleshooting

If something feels off:

- **Pipeline stuck**  
  - If the pipeline seems frozen, let the run finish and check if the results appear.  
  - If not, try a smaller batch of URLs.

- **No results for a tweet**  
  - Make sure the URL is a direct tweet link, not a profile or search link.
  - Check if the tweet is public and not deleted.

- **Errors or weird behavior**  
  - Take a screenshot.
  - Note the approximate time and what you were doing.
  - Contact the maintainer so they can check backend logs.

CrownTALK is under active development; UX and quality will continue to improve over time, but the basic usage described here should remain stable.
