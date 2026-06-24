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
learn.html      Learn — 13 lifecycle phase cards (Clauses 4–9)
quiz.html       Quiz — 15-question timed assessment
contact.html    Contact — feedback form
```

Shared across all pages:
- `style.css`   — all visual styling
- `nav.js`      — sets the active state on the current page's nav link

Page-specific JavaScript:
- `learn.js`
- `quiz.js`
- `contact.js`

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

---

### Learn (learn.html)

**Purpose:** Present all 13 IEC 62304 process areas (Clauses 4–9) as expandable cards, with a training level toggle, safety class filter, and a progress tracker.

**Layout:**
- Page header with description
- Controls bar: progress tracker (left) + level toggle + filter buttons (right)
- Responsive card grid (auto-fill, minimum 320px per card)

**Interactive features:**
1. **Expand/collapse cards** — clicking the card header reveals the detailed requirements list. Implemented with event delegation on the grid container (one listener, not 13).
2. **Introductory / Advanced level toggle** — switches all card detail bullets between an overview level and clause-referenced, audit-context content. Level changes update bullet content in place (without rebuilding the card DOM) so expanded state and studied progress are preserved. The chosen level is persisted in `localStorage` so it survives page reloads and is available to the quiz page when printing the certificate.
3. **Safety class filter** — buttons filter the visible cards by Class A, B, or C. Class C requires all 13 process areas; Class A requires only a subset. Implemented with `classList.toggle('hidden')`.
4. **Progress tracker** — each card has a "Mark as Studied" button. Clicking it marks the card with a green left border and updates the progress bar. Progress is stored in a JavaScript `Set` during the session.

**Data model:** All 13 phases are defined as an array of objects in `learn.js`. Each object holds the clause number, title, icon, summary, two detail arrays (`introDetails` and `advancedDetails`), and an array of applicable safety classes (`['A','B','C']`, `['B','C']`, or `['C']`). The DOM is built entirely from this array using `createElement` and `innerHTML`.

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

**Data model:** 15 questions defined as an array of objects in `quiz.js`. Each object holds the question string, four option strings, the index of the correct answer, and an explanation. The array is shuffled with a Fisher-Yates shuffle on each new quiz attempt so questions appear in a different order every time.

**Pass mark:** 80% (12 of 15 correct). Passing earns a certificate that is populated with the participant's name, score, date, and the training level (Introductory or Advanced) read from `localStorage`.

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
- `e.preventDefault()` prevents any page reload
- Errors display in `<span role="alert">` elements beneath each field
- "Send another message" resets the form and restores it

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

Key patterns used:
- **Event delegation** (`learn.js`) — one `click` listener on the card grid handles expand, collapse, and mark-as-studied for all 13 cards
- **In-place DOM update** (`learn.js`) — the level toggle replaces only the `<li>` bullet elements inside each card's existing `<ul>`, rather than rebuilding the whole grid, so expanded/collapsed state and studied progress are preserved across level changes
- **`localStorage` for cross-page state** (`learn.js` / `quiz.js`) — the training level chosen on the Learn page is saved to `localStorage` so the Quiz page can read it when printing the certificate; the two pages share no JavaScript and communicate only through this browser storage key
- **State object** (`quiz.js`) — all quiz state (current index, score, timer ID, time remaining) is held in one `quizState` object, making it easy to reset cleanly
- **Validator functions** (`contact.js`) — each field has its own pure validation function that takes a string and returns an error message or an empty string. This keeps validation logic separate from DOM interaction

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
