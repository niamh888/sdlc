# Design Plan: IEC 62304 SDLC Training Site

## Project Concept

An interactive, self-paced training course covering the IEC 62304 medical device software development lifecycle standard. The site is aimed at software developers, quality engineers, and regulatory affairs professionals who need working knowledge of the standard — either for day-to-day compliance or to prepare for audits and assessments.

The project serves a dual purpose: it satisfies the UCD JavaScript module brief (HTML/CSS/JS, interactivity, DOM manipulation, GitHub Pages), and it is a useful domain-specific tool that could be expanded into a full certification prep platform.

This document explains *design* decisions — layout, interaction, visual and
JavaScript architecture. For a demonstration of the project's own IEC
62304-style lifecycle *documentation* (development plan, requirements,
architecture, verification, risk management, problem resolution and the
rest, applied reflexively to this project's own development), see
[docs/README.md](docs/README.md).

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
data/phases.json               13 lifecycle process areas (course content)
data/applicability.json        safety class applicability, per sub-clause (regulatory mapping)
data/questions-intro.json      15 introductory quiz questions
data/questions-advanced.json   15 advanced quiz questions
```

`phases.json` and `applicability.json` are separate on purpose. One is editorial
content; the other is regulatory fact transcribed from the standard. They have
different review needs — the mapping has to be checkable against IEC 62304 without
wading through prose — and the Learn page cross-checks one against the other on every
load. See "Safety class applicability" below.

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
3. **Safety class filter** — buttons filter the visible cards by Class A, B, or C, driven by the sub-clause applicability data rather than a per-clause list. Class C requires all 13 process areas in full; Class B requires all 13 but four only in part; Class A requires 10, five of those only in part. Implemented with `classList.toggle('hidden')` plus a `partial-applicability` class on cards that apply only in part.

   **Filter notice.** Selecting a class reveals a panel directly beneath the filter buttons naming every process area that has been hidden and why. This addressed two separate problems. The first was plain usability: hiding cards further down a long page is invisible feedback, so a user who clicked "Class A" had no way of knowing whether anything had happened, how many topics were removed, or which ones. Screen reader users got no feedback at all, which the panel's `role="status"` with `aria-live="polite"` now fixes — polite rather than assertive because the user initiated the change themselves.

   The second problem was more serious. The panel was originally built on the uncorrected data, in which **Clause 7, Software Risk Management** was hidden at Class A — so the notice drew the reader's attention to exactly the wrong conclusion: that Class A software needs no risk management. The reverse is true. You cannot arrive at Class A *without* a risk analysis establishing that the software item cannot contribute to a hazardous situation, and §7.4.1 applies at every class. With the data corrected, Clause 7 now shows at Class A with only §7.4.1 live, and the panel carries a caution for **every** class including C: the classification is an *output* of the ISO 14971 risk analysis rather than an alternative to it, and the risk management file must be re-checked whenever intended use, requirements, architecture, risk controls or SOUP change. At Class A an additional paragraph rebuts the "no risk management" reading directly and cites §4.3 and §4.2. That paragraph is keyed to the class being A, not to Clause 7 being hidden — tying it to a condition in the data was how the notice came to depend on the error in the first place.

   The omitted list is generated from the same data that drives the filtering, so it cannot fall out of step with what is actually on screen. Tests derive their expected counts from the data files for the same reason.

4. **Deliverables list** — selecting a class also generates the documented outputs required at that class, on screen, as a CSV download, or printed. Described in full under [Deliverables list](#deliverables-list) below.
5. **Example artefact links** — every card carries a "Preview example document" and "Download (PDF)" pair, pointing at this project's own worked example of the document that process area would produce (`docs/`, generated by `docs/render.py` and, for the PDF, `docs/render_pdf.py` — see [docs/README.md](docs/README.md)). The download is a PDF, not the markdown source it used to offer: this course is taken by people working in Word, Excel, PowerPoint and PDF, not GitHub or markdown, and a raw `.md` file is source code to that audience, not a document. Placed at the card level rather than inside the deliverables rows deliberately: the deliverables list's whole point is that it never invents a document name, and attaching one concrete file to a per-sub-clause row would blur that line. A card already carries a title for the whole process area, which is where a worked example belongs. Every such page opens with a training-example disclaimer stating plainly that this site is not a real medical device and the file is not an actual regulatory deliverable. Within each document's own text, references to source files (`tests/test_site.py`, `data/*.json`, this project's design notes) are plain, non-clickable mentions rather than links — the same audience reasoning: a link to a raw source file or an unrendered markdown file is a dead end for someone without a code editor or a GitHub account.

   **Marking a topic studied requires having opened its example document first** — either Preview or Download counts, `learn.js`'s `markStudied()` checks a `previewedDocs` set populated by the click on either link. This is deliberate: the study-progress tracker previously counted a topic as studied the moment its button was clicked, whether or not the card had even been expanded, which measured nothing. The check runs at the point of the attempt rather than by disabling the button up front — the same pattern the quiz's name field already uses, since a pre-emptively disabled control gives a screen reader user no way to discover why it's inert. A blocked attempt auto-expands the card (the document link lives inside the collapsed `.phase-details`, so a reader could otherwise be shown an error pointing at something they can't see) and moves focus to the Preview link, so the error is a next step rather than a dead end. The message itself lives in a `role="alert"` span with reserved height, the same `.field-error` treatment the contact and quiz forms already use, so nothing shifts when it appears.
6. **Promotional strip** — a single banner beneath the topic cards credits St John Lynch & Co and AskRiskIE (a recommended ISO 14971 risk management platform) side by side inside one card, separated by a hairline divider, each half linking out to the respective site. This replaced an earlier design (see git history) of two independent sticky cards, one in each margin, shown only on monitors wide enough (≥1600px) that `.container`'s own 1100px max-width left large empty gutters either side. That design fixed the empty-gutter problem but introduced a new one: two small cards sitting in isolation on opposite edges of the page read as two unrelated widgets rather than one deliberate placement, and disappeared completely below the breakpoint, so most visitors never saw it at all. The strip fixes both — it renders inside `.container` at the same 1100px width as everything else (so it can never look like a mismatched pop-up next to the real content) and is visible at every viewport, stacking the two halves vertically below 700px rather than squeezing them into unreadable columns. Placed *after* the topic cards in the HTML, not before or between them, so a screen reader or keyboard user reaches the actual course content first. Hidden on print with an explicit rule — it is decorative advertising, not something that belongs in a printed certificate or deliverables checklist.

---

### Safety class applicability

**The model.** IEC 62304 assigns requirements to safety classes per *sub-clause*, not per clause. `data/applicability.json` records all 97 sub-clauses of Clauses 4–9 with the classes each applies to, sourced from Table A.1 as amended and cross-checked line by line against the `[Class …]` tags in the normative text. Where the two could differ the normative text governs, because the standard states Table A.1 is provided for convenience only.

**Why it was rebuilt.** The original model carried one hand-maintained list of classes per clause. Clause 7 (Software Risk Management) was recorded as Class B and C only, so filtering to Class A hid the entire clause and implied that Class A software needs no risk management — the reverse of the truth, since §7.4.1 applies to every class and the classification is itself an output of ISO 14971 risk analysis. Worse, a filter notice had been built on top of that data which specifically drew attention to Clause 7 being hidden, amplifying the error rather than catching it.

Checking the mapping against the standard found two more: **Clause 5.3** was recorded as reaching Class A when it has no Class A requirement at all, and **Clause 5.4** was recorded as Class C only when §5.4.1 reaches Class B.

**Why none of them was caught.** A single list has nothing to disagree with. The data was wrong, the UI faithfully rendered the wrong data, and the test suite — which hardcoded "Class A shows 10 of 13" — asserted the wrong count and would have *failed* when the error was fixed. A test that repeats a value from the data cannot detect an error in the data.

**The two guards now in place:**

- **A cross-file invariant.** The clause-level `classes` in `phases.json` must equal the union of that clause's sub-clause classes in `applicability.json`. `mergeApplicability()` checks this on every page load and throws if they disagree, naming the clause. The Learn page then shows its error panel and renders no cards. Failing loudly on a data error is strictly better than a page that quietly teaches something incorrect — particularly here, where a reader might carry the wrong conclusion into a real regulatory submission.
- **A regression test.** The `applicability` group puts the original Clause 7 value back and asserts the site rejects it. Every other expected value in that group is derived from the data files rather than written out.

**What the reader gains.** Three states instead of two — applies in full, applies in part, does not apply — with the specific sub-clauses named. "Clause 7 applies to Class A" is true and nearly useless; "of Clause 7, only 7.4.1 applies at Class A" is the answer someone can act on. Each expanded card carries a real `<table>` of its requirements against A/B/C, with `scope` attributes and screen-reader text in every cell so meaning does not depend on a tick's position or on colour. Rows are dimmed rather than removed when they carry no requirement at the filtered class, because hiding them would recreate the original problem of invisible omissions.

**Expanded cards span the grid.** The card grid packs at a minimum of 320px, which is fine for a collapsed summary but far too narrow for a five-column requirements table. `.phase-card.expanded { grid-column: 1 / -1 }` gives the open card the full row.

**Provenance and open items are recorded in the data file itself** (`_source`, `_crossCheckedOn`, `_openItems`, `_resolvedItems`), so anyone reviewing it can see where each value came from. `_openItems` is now empty and the test suite asserts it stays that way. One entry is recorded as resolved on a different basis and the file says so: Amendment 1 replaced 5.7.5 in full and gave it **no `[Class …]` tag at all**, so it is recorded as A/B/C on three grounds — Table A.1 assigns "5.7 All requirements" to all three classes, every other sub-clause of 5.7 is explicitly tagged all-classes, and software system testing applies to all classes so a record-keeping requirement supporting it does too. That is the only value derived from the annex plus the absence of a restriction rather than from a normative tag, and hiding that fact would misrepresent how solid it is.
5. **Progress tracker** — each card has a "Mark as Studied" button. Clicking it marks the card with a green left border and updates the progress bar. Progress is stored in a JavaScript `Set` during the session.

**Data model:** All 13 topics live in `data/phases.json` and are fetched when the page loads. Each object holds the clause number, title, icon, summary, two detail arrays (`introDetails` and `advancedDetails`), and an array of applicable safety classes (`["A","B","C"]`, `["B","C"]`, or `["C"]`). The DOM is built entirely from this data using `createElement` and `innerHTML`.

The topics were originally a hardcoded array inside `learn.js`. They were moved out for two reasons: content and display logic are separate concerns, so a wording correction should not risk a JavaScript syntax error that breaks the page; and treating the content as a real external resource forces the page to handle the loading and failure states that any real data source has.

**Asynchronous behaviour:** `initPhases()` implements the three states explicitly — a spinner while fetching, the card grid on success, and an error panel with a **Try again** button on failure. The filter and level controls are hidden until the data arrives, since offering a filter before there is anything to filter would mislead the user. Event listeners are attached *before* the request starts, so the page is interactive during the load rather than after it; event delegation on the grid container is what makes this possible, because the listener can be attached before any cards exist.

---

### Deliverables list

**Purpose:** Choosing a safety class on the Learn page answers "so what do I actually have to produce?" — the question a reader is really asking when they filter. The panel is hidden while the filter reads **All**, because "the deliverables for every class at once" is not a meaningful list; it appears when A, B or C is selected, showing 40, 65 and 71 documented outputs respectively.

**Organised by requirement, not by document — deliberately.** The obvious design is a list of document titles: Software Development Plan, Software Requirements Specification, Architecture Design Description. It is also the wrong design, because IEC 62304 states it *"does not prescribe the name, format, or explicit content of the documentation to be produced… the decision of how to package this documentation is left to the user of the standard."* Those titles are a widely used convention, not a requirement, and a training tool that printed them in a column headed "required deliverables" would be teaching something the standard does not say — the same class of error as the Clause 7 mapping, just harder to spot because the output *looks* authoritative. So every row cites its sub-clause, and the output column carries the standard's own wording from the `output` field in `applicability.json`. Packaging is left to the reader, which is exactly where the standard leaves it.

**Requirements with no documented artefact are listed, not dropped.** 26 of the 97 sub-clauses (24 of those live at Class C) require an activity without naming anything to keep. Omitting them would imply the requirement does not exist; they are shown with the text *"no documented artefact named by the standard — an activity you must perform, and decide for yourself what evidence to keep."* Those rows are the ones where a manufacturer actually has to exercise judgement, so they are the least safe to hide.

**But "no artefact" hides two different situations, and the panel distinguishes them.** §4.1 (quality management system) and §4.2 (risk management) name no 62304 artefact for a quite different reason from the other 24: they are satisfied *in another standard*. Telling a reader to "decide for yourself what evidence to keep" about ISO 14971 compliance would be actively misleading. Those two rows carry an optional `seeAlso` field and render a citation block instead.

The content of that field is constrained to what 62304 itself says, and the two rows differ in kind — which is the point worth teaching:

- **§4.1 offers alternatives.** NOTE 1 gives three routes: a quality management system complying with **ISO 13485**, *a national quality management system standard*, or *a quality management system required by national regulation*. NOTE 2 points to **ISO/IEC 90003** for guidance on applying quality management requirements to software; Annex B.2 calls that guidance highly recommended but not required, and Annex D.2 records that the QMS need not be certified.
- **§4.2 does not.** The normative text says the manufacturer *shall* apply a risk management process complying with **ISO 14971** — one standard, no alternative, no equivalent. The row states that explicitly, because a reader who has just read §4.1's three routes will otherwise carry the wrong inference across.

**Two things the rows deliberately do not say.** ISO 9001 is not offered as a route: it appears in 62304 only as the parent of ISO/IEC 90003, which is guidance, so presenting it alongside ISO 13485 would assert something the standard does not. And neither row offers a non-medical-device equivalent, because 62304's scope is medical device software — there is no non-medical branch in the standard to cite, so any such wording would be invented rather than quoted. Both exclusions are recorded in `_notes` in the data file and asserted by tests, so a future edit that reintroduces them fails rather than ships.

**No new source of truth.** `deliverablesFor(cls)` derives the list from `applicability.json` at render time — the same file the filter, the notice and the per-card tables read. Adding a second list of deliverables would reintroduce precisely the failure mode that produced the Clause 7 error: two hand-maintained records of the same fact, drifting apart with nothing to detect it.

**Collapsible.** The list runs to 95 rows at Class C, so it is collapsed by default behind a **Show list** toggle that carries `aria-expanded`, with the count visible in the heading. The count is the part most readers want; the rows are for the one who is building a plan.

**CSV export, built in the browser.** There is no backend, so the file is assembled as a string, wrapped in a `Blob`, and handed to a temporary `<a download>` that is clicked and removed. Two details matter more than they look:

The export carries eight columns, including the cross-reference, because the CSV is what someone actually works from when building a gap analysis.

- **Escaping.** `csvCell()` wraps any value containing a comma, double quote or newline in quotes and doubles the internal quotes. Without it, one description containing a comma shifts every later column — the file still opens cleanly, it is just wrong, which is the worst kind of bug in an export. 47 rows of the Class B export contain commas.
- **A UTF-8 byte order mark.** Excel reads a UTF-8 CSV as the local ANSI codepage unless the file begins with a BOM, so every `§` would arrive as mojibake. The three-byte prefix fixes it and is ignored everywhere else.

The filename encodes the class (`iec62304-deliverables-class-b.csv`) so three exports do not overwrite each other in the downloads folder.

**Printing, and a bug it exposed.** A `@media print` block hides the header, nav, footer and filter controls and expands the list, so the panel prints as a usable checklist. Adding it surfaced an existing fault: the certificate print rules hid `<main>` for the whole site, so printing *any* page produced a blank sheet. Those rules were scoped to `body.page-quiz`, which is why `quiz.html` now carries that class. The test suite asserts a non-quiz page still has visible content under print media.

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

**Back-end:** Submissions POST to a Formspree endpoint, so messages are actually delivered by email. Formspree was chosen because it requires no server-side code, which keeps the project deployable as static files on GitHub Pages. The endpoint URL is public by design — it is a write-only drop box that accepts submissions but cannot be read from.

**Server error reporting:** `buildSubmissionError()` reads Formspree's JSON error body rather than reporting a bare status code, and routes field-level messages back to the individual inputs via the same `showFieldError()` used by the client-side validators. Client-side validation is treated as a convenience that catches mistakes early, not as a guarantee — the server has information the browser does not (blocklists, bouncing domains, spam scoring) and gets the final say, so the form must be able to display errors that arrive after submission. Responses with no usable JSON body fall back to messages chosen by status code, since 429 (slow down), 403/404 (misconfigured) and 5xx (retry later) each imply a different fix.

**Spam and quota protection:** A `_gotcha` honeypot field is hidden from real users with `display:none`, `tabindex="-1"` and `aria-hidden="true"` — invisible to keyboard and screen reader users as well as sighted ones. Bots read the HTML and fill it in; Formspree discards those submissions. This protects the free plan's monthly submission limit. A `_subject` field sets the notification email subject so messages are identifiable in an inbox.

**Demo mode:** Blanking `CONTACT_ENDPOINT` switches submission to a simulated awaited delay, for working on the form locally without spending real submissions. The confirmation wording changes to match — it reports the message as *validated* and states that nothing was transmitted, rather than claiming "Message Sent!" untruthfully.

---

### Content provenance and accuracy

**Two placements, because they answer different questions.** "Where did this claim come from?" has to be answered next to the claim; "what is this site's relationship to the standard?" belongs in one place, in full.

The Edition 2 notice on the Learn page gained a source line: IEC TC 62 work programme and Edition 2 committee drafts, a review date, and an instruction to confirm the current stage with IEC. The date is marked up as `<time datetime="2026-07-30">` so it is machine-readable and can be asserted by a test rather than parsed out of prose. **The date is the load-bearing part.** The notice's four bullets about Edition 2 were already correctly hedged as *proposed*, but with no date on them a reader in 2028 has no way to tell whether they describe the current draft or a superseded one. A dated claim can be judged stale; an undated one just becomes quietly wrong, which is the same failure mode as the Clause 7 mapping — plausible, unchallenged, and incorrect.

The full statement lives on the privacy page under its own `#content-sources` heading. A small site is better served by one footer-linked page for statements of this kind than by two, and the footer is where readers look. It is kept under a separate heading so it does not read as part of the data protection notice, and it covers: the licensed copy of IEC 62304:2006+AMD1:2015 the content is based on, and that the standard's text is **not** reproduced; Table A.1 as amended as the source of the class mapping; the IEC TC 62 work programme as the source of the Edition 2 status; a disclaimer that the site is not affiliated with, authorised by or endorsed by the IEC; and that where the site and the standard disagree, **the standard governs**.

**One sentence of it constrains the architecture, deliberately.** The notice already claimed that *"every file the page loads comes from this site"*, and the provenance section now adds that *"your browser never contacts the IEC, or any other third party."* Both are true today. If the Edition 2 stage is ever populated live from the IEC Projects API, the fetch must therefore happen **away from the visitor's request** — a scheduled job that writes a JSON file into the repo, which the page then loads like any other static data. Calling IEC from the browser would disclose every visitor's IP address to a third party and falsify two statements in the privacy notice at once, quite apart from being impossible without publishing an API credential in client-side JavaScript. Recording the constraint here means the next person to reach for `fetch('https://api.iec.ch/...')` finds out why not before they write it.

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
- **Derive, never duplicate** (`learn.js`) — the filter notice, the per-card applicability tables and the deliverables list are all computed from `applicability.json` on each render. Nothing is stored twice, so nothing can drift; `deliverablesFor()` is a pure function of the loaded data and the selected class
- **Client-side file generation** (`learn.js`) — the CSV export builds a string, wraps it in a `Blob`, and clicks a temporary `<a download>`, with `URL.revokeObjectURL()` releasing the object URL afterwards. No server is involved, which is the whole point on a static host

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
