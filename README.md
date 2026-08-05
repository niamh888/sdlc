# IEC 62304 SDLC Training

An interactive web-based training course covering the IEC 62304 medical device software development lifecycle standard.

## Live Site

Hosted on GitHub Pages: [https://niamh888.github.io/sdlc/](https://niamh888.github.io/sdlc/)

## Project Overview

This course is designed for software developers, quality engineers, and regulatory affairs professionals working on medical device software. It covers the 13 process areas defined in IEC 62304:2006+AMD1:2015 across Clauses 4–9.

### Which version of the standard this covers

**Edition 1 — IEC 62304:2006 together with Amendment 1:2015**, the version
currently in force. The consolidated text carries the designation Edition 1.1.

**Edition 2 is under development and is not covered.** Because "IEC 62304" alone
is now ambiguous, the version is stated in three places: a chip in the site
header on every page, an explicit statement in the home page hero, and the
Edition 2 notice on the Learn page, which summarises the proposed changes and
says plainly that they are not yet confirmed. The `version` test group asserts
all of this, so it cannot quietly disappear in a redesign.

## Features

- **Home page** — Introduction to IEC 62304 with key statistics
- **Learn page** — 13 expandable topic cards covering Clauses 4–9, loaded from JSON; generates the deliverables required at the selected safety class, on screen, as CSV or printed; toggle between Introductory and Advanced depth; filter by safety class (A/B/C) with a notice distinguishing *applies in full*, *applies in part* and *does not apply*, naming the specific sub-clauses, plus a standing ISO 14971 caution; each card carries a per-sub-clause applicability table; study progress tracker
- **Quiz page** — two 15-question assessments (Introductory and Advanced), with only the set matching your chosen level downloaded; randomised order, 30-second timer per question, immediate feedback, and a pass/fail results screen; 80% pass mark earns a downloadable certificate that reflects the training level completed
- **Contact page** — Feedback form with real-time client-side validation and asynchronous submission to a live Formspree endpoint (no page reload), including a request timeout and field-level server error reporting
- **Privacy page** — Data protection notice covering what the contact form collects, the transfer to Formspree in the US, browser storage, and visitors' rights; linked from every footer and summarised beneath the Send button. Also carries a **content provenance** section: where the course content, the safety class mapping and the Edition 2 status each come from, a disclaimer of IEC affiliation, and confirmation that no request of yours reaches IEC

## Safety Class Applicability

IEC 62304 assigns requirements to safety classes **per sub-clause**, not per clause,
and the site now models it that way. [data/applicability.json](data/applicability.json)
records every sub-clause of Clauses 4–9 with the classes it applies to, taken from
**Table A.1 as amended** and cross-checked line by line against the `[Class …]` tags
in the normative text. Where the two could differ the normative text governs, since
the standard states Table A.1 is provided for convenience only.

**Why this file exists.** The site previously carried one list of classes per clause,
maintained by hand. Clause 7 (Software Risk Management) was recorded as Class B and C
only, so filtering to Class A hid the whole clause and implied Class A software needs
no risk management — the reverse of the truth, since §7.4.1 applies to every class and
the classification is itself an *output* of risk analysis. Checking against the
standard turned up two more: **Clause 5.3** was marked as reaching Class A when it has
no Class A requirement at all, and **Clause 5.4** was marked Class C only when §5.4.1
reaches Class B.

None of the three was detectable in the old model, because a single hand-maintained
list has nothing to disagree with. Two things now prevent a recurrence:

- The clause-level `classes` in `phases.json` **must equal the union** of that
  clause's sub-clause classes. If they disagree the Learn page refuses to render and
  names the offending clause. A loud failure beats a page that quietly teaches
  something wrong.
- The `applicability` test group asserts the mapping and includes a **regression test
  that puts the original Clause 7 error back** and requires the site to reject it.

**What it changes for the reader.** The filter now answers three questions rather than
two — applies in full, applies in part, does not apply — and names the specific
sub-clauses. "Clause 7 applies to Class A" is true and nearly useless; "of Clause 7,
only 7.4.1 applies at Class A" is the actual answer. Each expanded card carries a
table of its requirements against A/B/C, with rows dimmed when they carry no
requirement at the class being filtered.

**Amendment 1 traps.** The file flags the places where a reader working from a 2006
copy would get it wrong: 5.7 (all requirements) moved from B,C to **A,B,C**; 6.2.3
moved to **A,B,C**, making Clause 6 uniformly all-classes; 5.8.1, 5.8.2, 5.8.7 and
5.8.8 moved to **A,B,C**; 5.1.12 is new at B,C; and 7.1.5 and 7.3.2 were removed.

**One entry rests on a different basis, and the file says so.** Amendment 1 replaced
5.7.5 in full and assigned it **no `[Class …]` tag at all**. It is recorded as A/B/C on
three grounds: Table A.1 assigns "5.7 All requirements" to all three classes, every
other sub-clause of 5.7 is explicitly tagged all-classes, and software system testing
applies to all classes so a record-keeping requirement supporting it does too. That is
the one value in the file derived from the annex plus the absence of a restriction
rather than from a normative tag, and it is recorded in `_resolvedItems` so anyone who
asks where it came from gets a straight answer. `_openItems` is now empty, and the test
suite asserts it stays that way.

## Deliverables List

Selecting a safety class on the Learn page generates the documented outputs required
at that class — **40 for Class A, 65 for Class B, 71 for Class C** — grouped by clause,
viewable on screen, downloadable as CSV and printable.

**It is organised by requirement, not by document, and that is deliberate.** IEC 62304
states it *"does not prescribe the name, format, or explicit content of the
documentation to be produced… the decision of how to package this documentation is
left to the user of the standard."* So "Software Requirements Specification" is a
sensible convention for packaging §5.2, but it is **not** a requirement, and a training
tool that presented it as one would be teaching something the standard does not say.
Every row therefore cites its sub-clause, and the "what the standard requires you to
produce" column uses the standard's own wording, recorded in the `output` field of
[data/applicability.json](data/applicability.json).

**Requirements with no documented artefact are still listed**, marked as *"no documented
artefact named by the standard — an activity you must perform, and decide for yourself
what evidence to keep."* There are 24 of these at Class C. Dropping them would imply
the requirement does not exist; showing them is more honest and more useful, since
those rows are precisely where a manufacturer has to make its own call about evidence.

**Two of those rows are different, and get the standard's own cross-reference instead.**
§4.1 (quality management system) and §4.2 (risk management) name no 62304 artefact because
they are satisfied *in another standard*. Labelling them "decide for yourself what evidence
to keep" would be worse than saying nothing, so they carry a `seeAlso` field quoting where
62304 actually points:

- **§4.1** — NOTE 1 offers three routes: a quality management system complying with
  **ISO 13485**, *a national quality management system standard*, or *a quality management
  system required by national regulation*. NOTE 2 points to **ISO/IEC 90003** for guidance on
  applying quality management requirements to software, which Annex B.2 calls highly
  recommended but **not required**. Annex D.2 adds that the QMS need not be certified.
- **§4.2** — the normative text says the manufacturer *shall* apply a risk management process
  complying with **ISO 14971**. One standard, no alternative and no equivalent offered. The row
  says so explicitly, because a reader who has just seen §4.1's three routes will otherwise
  assume an equivalent is acceptable here too.

**ISO 9001 is deliberately not offered as a route**, and neither is a non-medical-device
alternative. ISO 9001 appears in 62304 only as the parent of ISO/IEC 90003 — guidance, not a
compliance route — and the standard applies to medical device software only, so it contains no
non-medical branch to cite. The reasoning is recorded in `_notes` in the data file so the
question does not have to be re-litigated later.

**The CSV is built entirely in the browser** — there is no backend — using a `Blob` and
a temporary link. Two details worth knowing if you write one yourself:

- **Escaping.** Any field containing a comma, double quote or newline is wrapped in
  quotes with internal quotes doubled. Skip it and one description containing a comma
  silently shifts every later column: the file still opens, it is just wrong. 47 rows
  in the Class B export contain commas, so this is not hypothetical.
- **The byte order mark.** Excel reads a UTF-8 CSV as the ANSI codepage unless the file
  starts with a BOM, so the `§` characters would arrive as mojibake. The three-byte
  prefix fixes it and is harmless elsewhere.

**Printing the Learn page** now yields just this list. That also fixed a latent bug: the
certificate print rules hid `<main>` on *every* page, so printing anything other than
the quiz produced a blank sheet. They are now scoped to the quiz page via a `page-quiz`
class on `<body>`, and the test suite asserts both behaviours.

## Sources and Accuracy

Someone may carry a conclusion from this course into a real regulatory submission,
so where each claim comes from is recorded rather than assumed. Two places, doing
two different jobs:

- **At the point the claim is made.** The Edition 2 notice on the Learn page carries a
  source line naming the IEC TC 62 work programme and committee drafts, a
  **machine-readable review date** (`<time datetime="…">`), and an instruction to confirm
  the current stage with IEC. The date is the important half: a dated claim about a
  moving standard can be judged stale, whereas an undated one quietly becomes wrong.
  Nobody checks a legal page to find out whether a banner is current, which is why this
  is not only on the privacy page.
- **In one place, in full.** A "Where this site's content comes from" section on the
  privacy page covers the licensed copy of the standard the content is based on (and that
  its text is *not* reproduced), Table A.1 as amended as the source of the class mapping,
  the IEC TC 62 work programme as the source of the Edition 2 status, a disclaimer that the
  site is **not affiliated with, authorised by, or endorsed by the IEC**, and the statement
  that where the site and the standard disagree, **the standard governs**.

**One line of it is a data protection matter and is worth keeping true.** The notice says
your browser never contacts IEC or any other third party. That is only true because the
site loads nothing from anywhere else — so if the Edition 2 status is ever populated from
the IEC Projects API, the call has to happen away from the visitor's request (a scheduled
job that commits a JSON file), not from the browser. Doing it in the browser would disclose
every visitor's IP address to IEC and falsify two separate statements in the notice. The
`privacy` test group asserts both.

## Data Protection

Because the contact form sends real personal data (name, email, message) to a
third-party processor outside the EEA, the site carries a privacy notice at
[privacy.html](privacy.html), linked from the footer of every page and summarised
at the point of collection beneath the Send button.

What the site actually processes, in full:

| Data | Where it goes |
|---|---|
| Name, email, role, message | Formspree (United States), then email to the site owner |
| IP address, user agent | GitHub Pages server logs; Formspree on submission |
| Quiz name, answers, score | **Nowhere** — browser memory only, discarded when the tab closes |
| `62304_trainingLevel`, `62304_bannerDismissed` | **Nowhere** — browser localStorage only |

No cookies, no analytics, no tracking, and no external fonts or CDNs — every file
a page loads is served from this site. That is why no cookie consent banner is
required: the two localStorage values exist solely to honour a preference the user
has set, which is exempt as strictly necessary.

---

## Running the Site Locally

> ⚠️ **Read this if you are used to opening the HTML files directly.**

**This is a change from earlier versions of the project.** The site now loads its
content from JSON files at runtime, and browsers block that when a page is opened
directly from disk. **Double-clicking `index.html` will no longer work** — the Learn
and Quiz pages will show an error message instead of their content.

To run it locally, serve the folder over HTTP. Any of these will do:

```bash
# Option 1 — Python (already installed on most machines)
cd sdlc_training
python -m http.server 8000
# then open http://localhost:8000 in your browser

# Option 2 — Node.js, if you have it
npx serve

# Option 3 — VS Code
# Install the "Live Server" extension, right-click index.html → "Open with Live Server"
```

### Why this restriction exists

When you open a file directly, the page's address starts with `file://` instead of
`http://`. Browsers treat every `file://` page as coming from a different, untrusted
origin, and refuse to let it read other local files. The reason is sound: without
that rule, any HTML file you downloaded could quietly read your documents and send
them somewhere.

The site detects this situation and explains it rather than failing silently — see
`fetchJSON()` in `async-utils.js`. The hosted GitHub Pages version is served over
HTTPS, so it is unaffected.

---

## Asynchronous JavaScript in This Project

This section explains the asynchronous features, why each one is there, and the
general lessons worth carrying into other projects. The code itself is commented
in the same style, so reading `async-utils.js` alongside this is the fastest way
to pick it up.

### The one-sentence version

JavaScript can only do one thing at a time, so anything involving *waiting* —
a network request, a timer, a server reply — has to be started now and finished
later, leaving the page responsive in between. That is all "asynchronous" means.

### Why it matters: the shop with one assistant

A browser page runs your JavaScript on a **single thread**. Picture a shop with
one assistant serving one queue. While that assistant is busy, nobody else gets
served: the page cannot redraw, buttons stop responding, scrolling judders. A
frozen web page is almost always one thread stuck on one long job.

Here is the important part: most slow jobs are not the assistant *working*, they
are the assistant *waiting*. Waiting for a file to arrive over the network.
Waiting for a server to answer. Standing still during that wait wastes the
assistant entirely.

So JavaScript splits any slow job in two:

1. **Start the job** — instant.
2. **What to do when it finishes** — later.

In between, the assistant serves everyone else. Start now, finish later, don't
block the queue.

### Three generations of the same idea

| Generation | Looks like | Notes |
|---|---|---|
| **Callbacks** (oldest) | `button.addEventListener('click', doThing)` | Still the right tool for repeating events. Nesting them gets unreadable, and errors are awkward to catch. |
| **Promises** (2015) | `fetch(url).then(r => r.json()).catch(showError)` | A Promise is an object standing in for a result that doesn't exist yet. |
| **async / await** (2017) | `const data = await fetchJSON(url)` | Not a new mechanism — nicer syntax for Promises. Reads top-to-bottom and works with ordinary `try/catch`. |

**A Promise is a receipt.** You order something, and you get a tracking number
immediately — not the goods. The receipt is in one of three states, and once it
leaves the first it can never change again:

- `pending` — still waiting
- `fulfilled` — succeeded, and carries a value
- `rejected` — failed, and carries an error

**`async` and `await` are two halves of one tool:**

- `async` before a function lets you use `await` inside it, and makes the
  function always return a Promise. Even `async function f() { return 1 }`
  returns a Promise of 1, not 1.
- `await` before a Promise means *pause this function until the Promise settles,
  then give me its value*. It pauses only that one function — the browser keeps
  serving everything else. A polite pause, not a freeze.

### The rule worth memorising

**Every asynchronous operation has three states, and a good interface shows all three:**

| State | What the user should see |
|---|---|
| **Loading** | Something is happening — a spinner, a "Sending…" label |
| **Success** | The result |
| **Failure** | What went wrong, and what to do about it |

Building only the success path is the classic beginner mistake. It works
perfectly on your laptop and looks broken on hospital wifi. Every async feature
in this project implements all three, and the code comments label them
`STATE 1`, `STATE 2` and `STATE 3` so you can see the pattern repeat.

### What each file does

#### `async-utils.js` — shared helpers

Two small functions used by the other pages, plus the longest explanatory comment
in the project. Read this file first.

- **`delay(ms)`** — turns `setTimeout` (a callback) into something awaitable.
  Shows what a Promise actually *is* underneath the syntax, by building one by
  hand with `new Promise(resolve => ...)`. Usage: `await delay(250)`.
- **`fetchJSON(url)`** — downloads and parses a JSON file, converting the
  various ways that can fail into clear, plain-English error messages.

#### `learn.js` — loading page content

The 13 lifecycle topics were about 300 lines of hardcoded data inside this file.
They now live in `data/phases.json` and are fetched when the page loads.

The practical gain is that content and code are separate: correcting a clause
reference no longer means editing JavaScript and risking a syntax error that
breaks the whole page. The architectural gain is that the data became a genuine
external resource, which forced the page to handle loading and failure properly.

The page shows a spinner while loading, the cards on success, and an error panel
with a **Try again** button on failure. The filter and level controls stay hidden
until the data arrives, because offering a "filter by class" button when there is
nothing to filter is just confusing.

#### `quiz.js` — loading questions, and prefetching

The two question banks are now `data/questions-intro.json` and
`data/questions-advanced.json`. This fixed a real inefficiency: the old version
defined *both* sets on every page load and threw one away, so every visitor paid
to parse 30 questions in order to sit 15.

It also demonstrates **prefetching**, which is worth learning:

```js
// On page load — start the download, keep the receipt, don't wait for it
questionsPromise = loadQuestions(getLevel());

// Later, when the user clicks Begin — collect on the receipt
const questions = await questionsPromise;
```

This works because **a Promise is a value you can store**. It runs its work once
and remembers the outcome, so awaiting an already-finished Promise returns the
remembered result instantly instead of repeating the request. By the time the
learner has typed their name, the questions have usually arrived, so the click
feels instant. If they are quick off the mark, the button shows
"Loading questions…" and they simply join the wait already in progress.

#### `contact.js` — submitting a form

The old form validated the fields and revealed "Message Sent!" on the very next
line. It was instant, which was the giveaway that nothing was being sent anywhere.

The form now does a real `fetch` POST to **Formspree**, so submissions are
genuinely delivered by email. It handles:

- a **"Sending…"** state on a disabled button, which also blocks double-submission
- **`try` / `catch` / `finally`** around the request
- a **10-second timeout** using `AbortController`
- the form left on screen with the user's text intact if it fails, so they can
  just press Send again
- **server-side validation errors displayed beside the offending field**, not just
  in a banner — see below

#### Reading the server's reply properly

`buildSubmissionError()` exists because "HTTP 422" tells the person filling in the
form nothing about what to change. Formspree explains a rejection in the response
body:

```json
{ "errors": [ { "field": "email", "message": "is not a valid email" } ] }
```

So the code reads that body and puts each message next to the field it blames,
reusing the same `showFieldError()` the client-side validators use. The user
cannot tell which side found the problem, which is exactly right — they don't
care.

This is worth understanding as a principle: **client-side validation is a
convenience, never a guarantee.** It catches mistakes early and saves a pointless
round trip, but the server has information the browser does not (a blocklist, a
domain that bounces, a spam score) and always gets the final say. A form needs to
be able to display errors that arrive *after* submission.

Failures without a usable JSON body fall back to messages chosen by status code,
because each implies a different fix: 429 means slow down, 403/404 means the form
is misconfigured, 5xx means try again later.

#### Two hidden fields

`contact.html` sends two extra fields that Formspree understands:

- **`_subject`** — sets the notification email's subject line, so messages from
  this site are identifiable in an inbox.
- **`_gotcha`** — a *honeypot*. It is hidden from real users, but spam bots read
  the HTML rather than the rendered page and fill it in anyway. Formspree silently
  discards any submission where it has a value. This matters because the endpoint
  is public and a free plan has a monthly submission limit, which spam would
  otherwise consume.

The honeypot is hidden with `display:none` **plus** `tabindex="-1"` and
`aria-hidden="true"`, so it is invisible to keyboard and screen reader users too —
not just to sighted ones. A honeypot that a screen reader announces is an
accessibility bug.

#### Demo mode

Setting `CONTACT_ENDPOINT` to an empty string switches the form into demo mode: it
runs the entire async path but transmits nothing, which is useful for working on
the form locally without spending real submissions from the monthly quota.

Demo mode does not claim "Message Sent!", because that would be untrue. It reports
the message as *validated* and says explicitly that nothing was transmitted.

To watch the error-handling path in action, set `DEMO_FAILURE_RATE = 0.5` in the
same file and submit a few times.

> **Note on the public endpoint.** The Formspree URL sits in client-side
> JavaScript, visible to anyone who views source. That is by design — it is a
> write-only drop box that accepts submissions but cannot be used to read
> anything back. If the form ever starts returning `403`, check whether domain
> restrictions are enabled in the Formspree dashboard, as those will reject
> submissions from `localhost` during development.

---

### Techniques used, and where to find them

| Technique | Where | What it is for |
|---|---|---|
| `async` / `await` | all three page scripts | Readable sequential code for operations that involve waiting |
| `try` / `catch` / `finally` | `startQuiz`, `initPhases`, form submit | One `catch` covers a whole sequence of async steps; `finally` guarantees cleanup |
| `Promise.all` | `loadPhases`, `loadQuestions` | Run independent waits **concurrently** — total time is the longer one, not the sum |
| `fetch` + `response.ok` | `fetchJSON`, `sendMessageReal` | Download files and POST data — with the status check that fetch does not do for you |
| Reading an error response body | `buildSubmissionError` | Turning a bare status code into a message that says what to fix |
| `FormData` | form submit | Collects every named field, including hidden ones, with no manual assembly |
| `new Promise(...)` | `delay` | Wrapping an old callback API so it can be awaited ("promisifying") |
| `AbortController` | `sendMessageReal` | Cancelling a request — here, giving up after 10 seconds |
| Storing a Promise | `questionsPromise` in `quiz.js` | Prefetching: start early, await later |
| Disabling controls | every async button | Prevents double-submission while a request is in flight |
| `aria-busy` | every async button | Tells screen readers the control is working, not broken |
| `setInterval` (callback style) | the quiz timer | Deliberately *not* converted — Promises model a single result, so they suit repeating ticks badly |
| `defer` on `<script>` | all four HTML pages | Scripts run after the HTML is parsed, in order, without blocking rendering |

### Four traps worth remembering

These caused real bugs while this was being built, and all four are commented at
the point they occur in the code.

**1. `fetch` does not throw on 404 or 500.**
It only rejects when the request could not be made at all. A 404 is, as far as
`fetch` is concerned, a perfectly successful round trip — you asked a question
and the answer was "no". Forget `if (!response.ok)` and you sail on to parse the
server's HTML error page as JSON, producing a baffling syntax error a long way
from the actual cause.

**2. Call `preventDefault()` before your first `await`.**
The browser decides whether to run its default behaviour (submitting the form,
reloading the page) as soon as your handler hands back control — and `await`
hands back control. Called after an `await`, `preventDefault()` arrives too late
and the page reloads out from under you.

**3. Put cleanup in `finally`, not in both branches.**
Re-enabling a button in the `try` and again in the `catch` works right up until
someone edits one copy and not the other, and then the button is stuck reading
"Sending…" forever. `finally` runs on every path, so it can only be written once.

**4. A Promise that rejects with nothing listening logs a scary console warning.**
`quiz.js` starts a download long before anything awaits the result. If it fails
in the meantime, the browser reports an unhandled rejection. Attaching an empty
`.catch()` marks it acknowledged without swallowing it — the later `await` still
throws, because `.catch()` returns a *new* Promise and the original stays
rejected.

### Two things deliberately not done

Knowing when *not* to use a tool matters as much as knowing how.

- **No auto-advance between quiz questions.** `await delay(2000); nextQuestion()`
  would have been two lines, but a fixed pause takes control away from anyone who
  reads slowly, uses a screen reader, or wants to think about the explanation.
  Async tools should remove waiting, not impose it.
- **No IndexedDB.** It is the asynchronous alternative to `localStorage`, which is
  synchronous and does block the thread. But at a few short strings the cost is
  unmeasurable, and IndexedDB's much wordier API would obscure the lesson rather
  than teach it. `localStorage` is the right call at this size.

---

## Testing

The site ships with an automated test suite: **391 checks** covering content
integrity, every interactive feature, the asynchronous success *and* failure
paths, accessibility, and responsive layout.

### Setup (one time)

```bash
pip install -r tests/requirements.txt
python -m playwright install chromium
```

Playwright drives a real Chrome browser from Python. It is the only dependency,
and it is needed **only for testing** — the site itself still has none. If you
already have Google Chrome installed you can skip the second command; the suite
falls back to your system Chrome automatically.

### Running

```bash
python tests/test_site.py
```

That is all. The script **starts its own web server on a free port**, so you do
not need to run `python -m http.server` first, and it shuts the server down when
it finishes. It exits with code 0 if everything passed and 1 if anything failed,
so it can be wired into CI later.

```bash
python tests/test_site.py --headed          # watch it run in a visible browser
python tests/test_site.py --group quiz      # run one group only
python tests/test_site.py --group data --group a11y   # or several
```

### What it covers

| Group | Checks |
|---|---|
| `data` | JSON parses; 13 topics and 2×15 questions; no duplicate ids or questions; every `correct` index within range; all required fields present |
| `deliverables` | Per-class output counts derived from the data; panel hidden until a class is chosen; collapse/expand with `aria-expanded`; requirements with no artefact listed and labelled rather than dropped; CSV filename, UTF-8 BOM, CRLF, eight columns, comma escaping, and correct inclusion of 5.4.1 / 7.4.1 and exclusion of 5.1.4 and removed sub-clauses; print output; the §4.1 / §4.2 cross-references cite ISO 13485 and ISO 14971 on screen and in the CSV, **assert ISO 9001 is not presented as a route**, and are not mislabelled "decide for yourself"; **regression test that printing a non-quiz page is no longer blank** |
| `applicability` | Sub-clause mapping is complete and well formed; **clause-level classes equal the union of their sub-clauses**; spot checks against the standard (7.4.1, 5.4.1, 5.3.5, 5.7.1, 6.2.3 …); 97 rendered rows; per-class visible/partial counts; and a **regression test that reintroduces the original Clause 7 error and requires the site to reject it** |
| `learn` | Cards render from JSON; expand/collapse by mouse *and* keyboard; level toggle swaps content in place without losing expanded state; class filters; **filter notice lists exactly the omitted areas and carries the ISO 14971 caution at every class**; progress tracker; banner dismissal persists; 404, malformed JSON, empty list, and retry recovery |
| `quiz` | Name validation; scoring for correct, wrong and timed-out answers; timer counts down; full 15-question pass and fail runs; certificate contents; shuffling differs between attempts; prefetch downloads exactly one file; level selection; error states and retry |
| `contact` | Field validation on blur and submit; request body contents and headers; "Sending…" state; success, 422 field errors, 429/404/503 fallbacks, network failure; double-submit guard; spam honeypot hidden three ways |
| `privacy` | Notice covers the controller, processor, US transfer, retention and supervisory authority; footer link on all five pages; point-of-collection note; home page topic count matches the data; **content provenance** names the edition, the source of the class mapping and of the Edition 2 status, disclaims IEC affiliation, and states no visitor request reaches IEC |
| `version` | Version chip present and visible on all five pages; home hero states Edition 1 and that Edition 2 is not covered; Edition 2 notice is a bounded card with a labelled header strip and `role="note"`; the notice carries a source line with a **machine-readable review date** and a link to the provenance section |
| `a11y` | axe-core (WCAG 2.1 A/AA + best practice) on all five pages **and** the loading, error, mid-quiz, feedback and results states; skip link; focus indicators verified before/after; `aria-current`; `prefers-reduced-motion` |
| `responsive` | No horizontal overflow at 1280/768/480/360px; form fields ≥16px to prevent iOS auto-zoom; tap target heights; usable at a 200% zoom equivalent |

### Two things worth knowing

**The contact form is never really submitted.** `contact.js` posts to a live
Formspree endpoint, so every test intercepts requests to `formspree.io` and
answers them locally. No test message is transmitted and none of the monthly
submission quota is consumed.

**Roughly half the checks deliberately break something** — a 404, malformed JSON,
a timeout, a rejected submission. Error handling that has never been executed is
not error handling, it is decoration. Testing only the happy path is the usual
mistake, and it is why a site can work perfectly on a fast laptop and fall apart
on hospital wifi.

### Anomaly log

Every time the suite runs, it reconciles `tests/anomaly_log.csv` — a standing
record of which checks are currently failing, matching the "software problem
resolution" record-keeping IEC 62304 §9 expects from a real project, rather
than letting a failure be fixed quietly with no trace it ever happened.

Each distinct failure (identified by its group and check name) gets its own
`ANOM-####` id the first time it appears, and **keeps that id across runs** —
it is not a fresh log per run, it is one continuously-updated file:

- a check failing for the first time **opens** a new anomaly;
- a check that keeps failing updates its `last_seen` date and `times_seen`
  count on the *same* row, rather than adding a new one — the file stays
  readable after a hundred runs instead of growing a row per failure per run;
- a check that used to fail and now passes is **closed** automatically, with
  the date, so there is a permanent record of when it was fixed;
- a check that was closed and fails again **reopens its original id**, so the
  id can be quoted in a commit message or a standup note and still mean the
  same thing weeks later.

Closing only ever happens for a group that actually ran, so `--group quiz`
cannot mark anomalies in other groups fixed just because they were not
re-checked. The console prints a summary after every run:

```
ANOMALY LOG  : tests\anomaly_log.csv
  ANOM-0004 [NEW     ] applicability — the mapping itself: sub-clause references are unique within a clause
  ANOM-0007 [CLOSED  ] learn — features: progress bar width updates
  2 anomalies open in total
```

The CSV itself (`id, status, group, test, first_seen, last_seen, times_seen,
closed_on, detail`) is committed to the repo, so its history — what broke, when,
and how long it stayed broken — is part of the project's record, the same as
any other file.

### What it does *not* cover

Being honest about the limits matters more than a green tick:

- **axe-core catches perhaps a third to a half of real accessibility problems.**
  Zero violations is a floor, not a certificate. It cannot tell you whether
  wording makes sense, whether a screen reader journey is coherent, or whether
  the reading order is sensible.
- **No real screen reader has been used.** NVDA or VoiceOver testing is manual
  and still worth doing.
- **One browser engine.** Chrome only; Firefox and Safari are untested.
- **The print/PDF certificate layout is not verified** — the suite stubs
  `window.print()` to confirm it is called, but nobody has checked how the
  certificate actually looks on paper.

## Files

| File | Purpose |
|---|---|
| `index.html` | Home page |
| `learn.html` | Lifecycle process area cards |
| `quiz.html` | Timed knowledge assessment |
| `contact.html` | Feedback and contact form |
| `privacy.html` | Privacy and data protection notice, linked from every footer |
| `style.css` | Shared CSS — professional medical theme, responsive layout, loading and error states |
| `async-utils.js` | **Shared async helpers** — `delay()` and `fetchJSON()`, plus the main explanation of how asynchronous JavaScript works |
| `nav.js` | Shared navigation — highlights active page link |
| `learn.js` | Topic card rendering, async content loading, expand/collapse, level toggle, safety class filter, per-class deliverables list and CSV export, progress tracking |
| `quiz.js` | Quiz engine — async question loading with prefetch, shuffle, timer, scoring, results, certificate |
| `contact.js` | Form validation and asynchronous submission with timeout and error handling |
| `data/phases.json` | **Content** — the 13 IEC 62304 process areas |
| `data/applicability.json` | **Regulatory mapping** — every sub-clause of Clauses 4–9, the safety classes it applies to, and the `output` field recording what the standard requires you to produce, and a `seeAlso` field for the two requirements 62304 satisfies by pointing at another standard |
| `data/questions-intro.json` | **Content** — 15 introductory quiz questions |
| `data/questions-advanced.json` | **Content** — 15 advanced, clause-referenced quiz questions |
| `tests/test_site.py` | Automated test suite — 391 checks; starts its own server |
| `tests/requirements.txt` | Test-only dependency (Playwright); the site itself has none |
| `tests/anomaly_log.csv` | **Generated, committed** — the standing anomaly/problem log described under [Anomaly log](#anomaly-log); updated by every test run |
| `DESIGN.md` | Design decisions and page-by-page rationale |
| `learn_pseudocode.md` | Pseudocode walkthrough of `learn.js` |

Script load order on every page is `nav.js`, `async-utils.js`, then the page
script, all marked `defer`. Deferred scripts run in document order, which
guarantees `delay()` and `fetchJSON()` exist before any page script calls them.

## Editing the Course Content

Content is now separate from code, so no JavaScript knowledge is needed to change it.

- **Change a topic or clause reference** — edit `data/phases.json`
- **Change what a requirement says must be produced** — edit the `output` field in `data/applicability.json`. Use the standard's own wording; omit the field entirely where the standard names no artefact.
- **Change which safety classes a requirement applies to** — edit `data/applicability.json`. If you change a sub-clause's classes such that the clause-level roll-up changes, you must update `classes` in `phases.json` to match, or the Learn page will refuse to render and tell you which clause disagrees. That is deliberate.
- **Add or reword a quiz question** — edit the relevant file in `data/`

JSON is stricter than JavaScript, and two rules catch most people:

- **No trailing commas.** The last item in a list or object must not be followed
  by a comma.
- **Double quotes only**, for both keys and text values. `'single quotes'` are
  not valid JSON.

If you break one of these, the page will tell you which file failed and suggest
these exact causes rather than failing silently. To check a file before
committing, paste it into [jsonlint.com](https://jsonlint.com/) or run:

```bash
python -c "import json; json.load(open('data/phases.json', encoding='utf-8'))"
```

Note that `correct` in the question files is a **0-based** index: `0` is the first
option, `3` the fourth. The quiz validates this on load and reports the question
number if it is out of range.

## Accessing the Hosted Project

Open [https://niamh888.github.io/sdlc/](https://niamh888.github.io/sdlc/) in any modern browser. No installation required.

To run locally, clone the repository and serve it over HTTP — see
[Running the Site Locally](#running-the-site-locally) above. Opening the HTML
files directly will not work.

## Browser Support

Works in all current browsers. The features used have been widely supported for
years: `fetch` and Promises since 2015–17, `async`/`await` since 2017,
`AbortController` since 2019. There is no build step, no bundler, and no
dependencies — the site is plain HTML, CSS and JavaScript.

## Standard Covered

IEC 62304:2006 + Amendment 1:2015 — Medical device software — Software life cycle processes
