# Design Plan: IEC 62304 SDLC Training Site

## Project Concept

An interactive, self-paced training course covering the IEC 62304 medical device software development lifecycle standard. The site is aimed at software developers, quality engineers, and regulatory affairs professionals who need working knowledge of the standard — either for day-to-day compliance or to prepare for audits and assessments.

The project serves a dual purpose: it satisfies the UCD JavaScript module brief (HTML/CSS/JS, interactivity, DOM manipulation, GitHub Pages), and it is a genuinely useful domain-specific tool that could be expanded into a full certification prep platform.

---

## Target Audience

- Software developers working on medical device software for the first time
- QA and regulatory staff needing a structured overview of IEC 62304
- Students studying medical device regulation or software engineering

---

## Site Structure

The site uses four separate HTML pages with shared CSS and shared navigation. A single-page application was considered and rejected in favour of this structure because separate pages are easier to maintain, load only the JavaScript they need, and are more appropriate for a multi-section educational tool.

```
index.html      Home — introduction and entry points
learn.html      Learn — 13 lifecycle topic cards (Clauses 4–9)
quiz.html       Quiz — 15-question timed assessment
contact.html    Contact — feedback form
privacy.html    Privacy and data protection notice
```

`privacy.html` is reachable from the footer of every page rather than the main
navigation. The main nav is kept to the four learning destinations so it stays
scannable; a legal notice belongs where users conventionally look for one. It is
deliberately not a nav item, and `nav.js` needs no change to accommodate this —
when no nav link matches the current page, nothing is highlighted.

Shared across all pages:
- `style.css`      — all visual styling
- `nav.js`         — sets the active state on the current page's nav link
- `async-utils.js` — shared asynchronous helpers (`delay()`, `fetchJSON()`)

Page-specific JavaScript:
- `learn.js`
- `quiz.js`
- `contact.js`

Content data, loaded at runtime rather than hardcoded in the scripts:
```
data/phases.json               13 lifecycle process areas
data/questions-intro.json      15 introductory quiz questions
data/questions-advanced.json   15 advanced quiz questions
```

Because content is fetched over the network, the site must be served over HTTP;
opening the HTML files directly from disk no longer works. See the README.

---

## Page-by-Page Design

### Home (index.html)

**Purpose:** Orient the user and route them to the two main activities (Learn or Quiz).

**Layout:**
- Sticky header with logo and navigation links
- Hero section: headline, subtitle, two CTA buttons, three stat cards (13 process areas / 3 safety classes / 15 questions)
- Three info cards below: What is IEC 62304 / Who needs it / How to use the course
- Footer with standard citation

**Key decisions:**
- The stat cards give the user an immediate sense of scope before they commit to either activity
- The hero uses a two-column grid (content left, stats right) that collapses to single-column on mobile
- **The version the course covers is stated in the hero.** The hero tag carries the designation (`Edition 1 · IEC 62304:2006+AMD1:2015`) and a bordered statement below the subtitle spells out what that means, because "Edition 1" alone does not tell most people that the amendment is included. It also says explicitly that Edition 2 is not covered. With Edition 2 in development, someone could otherwise study the wrong version of the standard — a content-correctness problem rather than a presentational one, which is why the `version` test group asserts it

---

### Version disclosure (site-wide)

A `.version-chip` in the site header on all five pages reads `Edition 1 · 2006+A1:2015`.

It is site-wide rather than home-page-only because a learner can arrive directly on the quiz from a link or a bookmark and would otherwise never be told which edition they are being assessed on. It sits in the header rather than in a strip below it to avoid spending vertical space on every page, and rather than in the footer because a version people need *before* they start studying should not be below the fold. White on the navy header measures 11.6:1, so it stays legible at 0.68rem.

---

### Learn (learn.html)

**Purpose:** Present all 13 IEC 62304 process areas (Clauses 4–9) as expandable cards, with a training level toggle, safety class filter, and a progress tracker.

**Layout:**
- Page header with description
- Controls bar: progress tracker (left) + level toggle + filter buttons (right)
- Responsive card grid (auto-fill, minimum 320px per card)

**Edition 2 notice:** Originally a full-width pale band with a bottom border, which is the visual language of a page *section* — so readers took it for part of the content rather than a notice. It is now a bounded, shadowed card with a solid amber header strip labelled "Important notice", capped at 820px so it clearly sits *on* the page rather than being part of it. The close button moved into that strip.

Three details worth recording. The colour `#8a6d1f` was chosen by calculation, not eye: white label text on it reaches 4.90:1, where the brighter `#c9a227` used elsewhere in the block manages only 2.42:1 with white and would have needed dark text. The title is a `<strong>`, not a heading, because the notice sits above the page's `<h1>` and a heading there would place an `h2` before the `h1` and muddle the document outline — `role="note"` with an `aria-label` conveys "this is an aside" without that cost. And `role="note"` is deliberate rather than `role="alert"`: the information is advisory and present on load, whereas an alert role is for something urgent appearing in response to a user action, and would interrupt a screen reader unnecessarily.

The notice also now states which edition the course covers, since that is the point a reader is most likely to get wrong.

**Interactive features:**
1. **Expand/collapse cards** — clicking the card header reveals the detailed requirements list. Implemented with event delegation on the grid container (one listener, not 13).
2. **Introductory / Advanced level toggle** — switches all card detail bullets between an overview level and clause-referenced, audit-context content. Level changes update bullet content in place (without rebuilding the card DOM) so expanded state and studied progress are preserved. The chosen level is persisted in `localStorage` so it survives page reloads and is available to the quiz page when printing the certificate.
3. **Safety class filter** — buttons filter the visible cards by Class A, B, or C. Class C requires all 13 process areas; Class A requires only a subset. Implemented with `classList.toggle('hidden')`.
4. **Progress tracker** — each card has a "Mark as Studied" button. Clicking it marks the card with a green left border and updates the progress bar. Progress is stored in a JavaScript `Set` during the session.

**Data model:** All 13 topics live in `data/phases.json` and are fetched when the page loads. Each object holds the clause number, title, icon, summary, two detail arrays (`introDetails` and `advancedDetails`), and an array of applicable safety classes (`["A","B","C"]`, `["B","C"]`, or `["C"]`). The DOM is built entirely from this data using `createElement` and `innerHTML`.

The topics were originally a hardcoded array inside `learn.js`. They were moved out for two reasons: content and display logic are separate concerns, so a wording correction should not risk a JavaScript syntax error that breaks the page; and treating the content as a genuine external resource forces the page to handle the loading and failure states that any real data source has.

**Asynchronous behaviour:** `initPhases()` implements the three states explicitly — a spinner while fetching, the card grid on success, and an error panel with a **Try again** button on failure. The filter and level controls are hidden until the data arrives, since offering a filter before there is anything to filter would mislead the user. Event listeners are attached *before* the request starts, so the page is interactive during the load rather than after it; event delegation on the grid container is what makes this possible, because the listener can be attached before any cards exist.

---

### Quiz (quiz.html)

**Purpose:** Test the user's knowledge with 15 timed multiple-choice questions, with immediate feedback and a final results screen.

**Layout — three screens (shown/hidden with `.active` class):**
1. **Start screen** — instructions and a Begin button
2. **Question screen** — progress bar, countdown timer, question text, four answer buttons, feedback panel
3. **Results screen** — score, pass/fail heading, breakdown (correct / incorrect / percentage), retry and review buttons

**Interactive features:**
1. **Answer selection** — clicking an option disables all buttons, highlights correct and incorrect, and shows an explanation panel. Implemented with `addEventListener` on each dynamically created button.
2. **Countdown timer** — a 30-second `setInterval` per question. The timer turns amber at 10 seconds and red at 5. If it expires, the correct answer is revealed automatically and the question is marked wrong.
3. **Results rendering** — the final screen is populated dynamically from the quiz state object, showing personalised pass/fail messaging and a score breakdown grid.

**Data model:** Two files of 15 question objects each — `data/questions-intro.json` (overview-level) and `data/questions-advanced.json` (clause-referenced, requiring in-depth knowledge of specific §references and Amendment 1 changes). Each object holds the question string, four option strings, the index of the correct answer (0-based), and an explanation. `getLevel()` reads the training level from `localStorage` and only the matching file is downloaded — the previous version defined both arrays on every page load and discarded one, making every visitor parse 30 questions to sit 15. The loaded array is shuffled with a Fisher-Yates shuffle on each attempt so questions appear in a different order every time.

Each question is validated on load (question text present, options an array, `correct` within range). A malformed question is reported by number rather than failing silently — an out-of-range `correct` index would otherwise mark every answer wrong with no indication why.

**Asynchronous behaviour:** The question file is *prefetched* — the request starts on page load while the learner is still reading the instructions, and the resulting Promise is stored in `questionsPromise`. `startQuiz()` awaits that stored Promise on click, so the data is normally already there and the click feels instant; a learner who clicks immediately sees the button switch to "Loading questions…" and joins the wait already in progress. Name validation runs before any awaiting, so an empty name is rejected instantly with no network activity. The Begin button is disabled during the load to prevent a double-click starting two quizzes at once, and restored in a `finally` block so it can never be left stuck.

**Pass mark:** 80% (12 of 15 correct). Passing earns a certificate populated with the participant's name, score, date, and the training level (Introductory or Advanced) read from `localStorage`. A level notice on the start screen shows the learner which question set they are about to sit, with a link to the Learn page if they want to switch level before starting.

---

### Contact (contact.html)

**Purpose:** Provide a feedback channel. Demonstrates JavaScript form validation without page reload.

**Layout:**
- Two-column grid: contact info panel (left) + form (right), collapses to single column on mobile
- On successful submission, the form is hidden and a success message replaces it in the same column

**Validation rules:**
- Name: required, minimum 2 characters
- Email: required, must match `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Role: optional dropdown
- Message: required, minimum 10 characters

**Behaviour:**
- Each field validates on `blur` (when focus leaves the field) to give inline feedback without waiting for submission
- On submit, all three required fields are re-validated before the form is accepted
- `e.preventDefault()` prevents any page reload — and is called *before* the first `await`, since the browser commits to its default behaviour as soon as the handler yields control
- Errors display in `<span role="alert">` elements beneath each field
- "Send another message" resets the form and restores it

**Asynchronous submission:** Validation is synchronous (instant local computation, no waiting), so an invalid form is rejected with no network activity at all. A valid form is POSTed with `fetch`, wrapped in `try`/`catch`/`finally`: the button is disabled and relabelled "Sending…" during the request, a failure leaves the form on screen with the user's text intact so they can retry, and `finally` restores the button on every path. `AbortController` enforces a 10-second timeout, because `fetch` has none of its own and a server that accepts a connection but never replies would otherwise leave the button stuck indefinitely.

**Back-end:** Submissions POST to a Formspree endpoint, so messages are genuinely delivered by email. Formspree was chosen because it requires no server-side code, which keeps the project deployable as static files on GitHub Pages. The endpoint URL is public by design — it is a write-only drop box that accepts submissions but cannot be read from.

**Server error reporting:** `buildSubmissionError()` reads Formspree's JSON error body rather than reporting a bare status code, and routes field-level messages back to the individual inputs via the same `showFieldError()` used by the client-side validators. Client-side validation is treated as a convenience that catches mistakes early, not as a guarantee — the server has information the browser does not (blocklists, bouncing domains, spam scoring) and gets the final say, so the form must be able to display errors that arrive after submission. Responses with no usable JSON body fall back to messages chosen by status code, since 429 (slow down), 403/404 (misconfigured) and 5xx (retry later) each imply a different fix.

**Spam and quota protection:** A `_gotcha` honeypot field is hidden from real users with `display:none`, `tabindex="-1"` and `aria-hidden="true"` — invisible to keyboard and screen reader users as well as sighted ones. Bots read the HTML and fill it in; Formspree discards those submissions. This protects the free plan's monthly submission limit. A `_subject` field sets the notification email subject so messages are identifiable in an inbox.

**Demo mode:** Blanking `CONTACT_ENDPOINT` switches submission to a simulated awaited delay, for working on the form locally without spending real submissions. The confirmation wording changes to match — it reports the message as *validated* and states that nothing was transmitted, rather than claiming "Message Sent!" untruthfully.

---

### Privacy (privacy.html)

**Purpose:** Disclose what personal information the site handles, where it goes, and what rights visitors have. This page became necessary when the contact form was connected to a live Formspree endpoint — before that the form transmitted nothing, so there was no personal data to disclose.

**Layout:** Single centred prose column capped at 760px. Lines much longer than roughly 90 characters are measurably harder to read, since the eye loses its place returning to the left margin — a real consideration for a page of continuous text, unlike the card grids elsewhere on the site.

**Key decisions:**
- **Plain-language summary first.** A highlighted box at the top states the five things that matter most, so nobody has to read the full page to learn what happens to their data. A privacy notice that is technically complete but practically unread does not achieve transparency.
- **Notice at the point of collection.** A linked page alone is not really sufficient: data protection law expects people to be informed when they are asked for their information, not to go looking for a separate page afterwards. A short note beneath the Send button names Formspree, states that data leaves the EEA, and links here.
- **The transfer outside the EEA is stated plainly, not buried.** Formspree is US-based, so submitting the form sends personal data to the United States. The page offers direct email as an alternative for anyone who would rather their data stayed in the EEA.
- **The quiz is explicitly addressed.** Users reasonably assume a scored assessment with a named certificate must be recording something. It is not — the name and score live in browser memory only. Stating this is more reassuring than omitting it.
- **No cookie banner.** The site sets no cookies, and the two `localStorage` values exist solely to honour a preference the user has set, which is exempt as strictly necessary. Adding a consent banner would be theatre.

---

## Visual Design

### Colour palette

| Token           | Value     | Use                              |
|-----------------|-----------|----------------------------------|
| `--primary`     | `#1a3a5c` | Header, headings, borders        |
| `--primary-light` | `#2e5b8a` | Button hover states            |
| `--accent`      | `#2980b9` | Links, filter active, quiz bar   |
| `--success`     | `#27ae60` | Correct answers, studied state   |
| `--danger`      | `#c0392b` | Incorrect answers, form errors   |
| `--warning`     | `#d35400` | Timer amber/red states           |
| `--bg`          | `#f4f6f9` | Page background, input fields    |

A deep navy and clinical blue palette was chosen to match the professional, regulatory context of the subject matter. The same palette is used in medical device company documentation and audit tools, so it signals credibility to the target audience.

### Typography

System font stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`. No external fonts are loaded, keeping the page fast and avoiding dependency on third-party CDNs.

### Responsiveness

Three breakpoints:
- Default: desktop (1100px container, multi-column grids)
- `max-width: 768px`: tablet — hero collapses to single column, contact layout stacks
- `max-width: 480px`: mobile — hero stats and CTA buttons stack vertically, nav links shrink

---

## JavaScript Architecture

Each page script is self-contained. There is no shared global state between pages. Functions are scoped by file. Event listeners are attached inside `DOMContentLoaded` callbacks so the DOM is always ready before manipulation begins.

All pages load `nav.js`, then `async-utils.js`, then their page script, each marked `defer`. Deferred scripts run after the HTML is parsed and in document order, which guarantees the shared helpers are defined before any page script calls them, without blocking rendering.

Key patterns used:
- **Event delegation** (`learn.js`) — one `click` listener on the card grid handles expand, collapse, and mark-as-studied for all 13 cards
- **In-place DOM update** (`learn.js`) — the level toggle replaces only the `<li>` bullet elements inside each card's existing `<ul>`, rather than rebuilding the whole grid, so expanded/collapsed state and studied progress are preserved across level changes
- **`localStorage` for cross-page state** (`learn.js` / `quiz.js`) — the training level chosen on the Learn page is saved to `localStorage` so the Quiz page can read it to select the correct question set, display the level notice on the start screen, and populate the certificate; the two pages share no JavaScript and communicate only through this browser storage key
- **State object** (`quiz.js`) — all quiz state (current index, score, timer ID, time remaining) is held in one `quizState` object, making it easy to reset cleanly
- **Validator functions** (`contact.js`) — each field has its own pure validation function that takes a string and returns an error message or an empty string. This keeps validation logic separate from DOM interaction
- **Async data loading** (`learn.js` / `quiz.js`) — content is fetched from JSON at runtime rather than hardcoded, with all three states of an asynchronous operation handled explicitly: loading, success, and failure with a retry option
- **Shared async helpers** (`async-utils.js`) — `delay()` promisifies `setTimeout`; `fetchJSON()` centralises the fetch-and-parse sequence and, critically, the `response.ok` check that `fetch` does not perform itself. Both translate low-level failures into messages a user can act on, including detecting the `file://` case and naming the fix
- **Validation at the boundary** (`loadPhases`, `loadQuestions`) — external data is checked for shape as it enters the program, so the rest of the code can trust it completely and failures are reported where their cause is obvious
- **Errors raised where they occur, handled where they can be acted on** — the loader functions deliberately contain no `try`/`catch`; they let errors propagate to the caller, which is the only place that knows where on the page to display a message
- **`finally` for cleanup** (`startQuiz`, form submit, `downloadCertificate`) — button state is restored on every path, so a control can never be left permanently disabled by an unexpected failure
- **Prefetching** (`quiz.js`) — a Promise is stored in a variable when the page loads and awaited later on click, exploiting the fact that a settled Promise returns its remembered result instantly rather than repeating the work

---

## GitHub and Deployment

Repository: [https://github.com/niamh888/sdlc](https://github.com/niamh888/sdlc)

Hosted via GitHub Pages at the root of the `master` branch. No build step is required — the site is plain HTML, CSS, and JavaScript.

Commit strategy (6 commits, each representing a distinct deliverable):
1. HTML structure for all four pages
2. CSS styling
3. Shared navigation script
4. Learn page JavaScript
5. Quiz page JavaScript
6. Contact form JavaScript
