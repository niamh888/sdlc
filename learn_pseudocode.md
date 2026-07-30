# learn.js — Pseudocode

## Overview

This file drives the Learn page. It fetches the 13 topics from a JSON file,
builds an expandable card for each one, handles expand/collapse and keyboard
interaction, lets the user toggle between Introductory and Advanced content,
filter cards by safety class, and tracks study progress with a progress bar.

---

## Data

**`phases`** — an array of 13 objects, one per IEC 62304 process area (Clauses 4–9),
**fetched from `data/phases.json` when the page loads**.

It starts as an **empty array** and is filled in once the download completes. This
is the key mental shift when data is loaded asynchronously: for the first moments
of the page's life the content does not exist yet, so every function that reads
`phases` must tolerate it being empty rather than assume the data is there.

Each object holds:

| Field             | Description                                                          |
|-------------------|----------------------------------------------------------------------|
| `id`              | Unique slug used to build element IDs (e.g. `planning`)              |
| `clause`          | Standard reference (e.g. `Clause 5.1`)                              |
| `title`           | Process area name                                                    |
| `icon`            | Emoji displayed on the card header                                   |
| `summary`         | One-sentence description shown without expanding                     |
| `introDetails`    | Array of overview-level bullet points (Introductory mode)            |
| `advancedDetails` | Array of clause-referenced bullet points with audit context (Advanced mode) |
| `classes`         | Safety classes this process applies to: A, B, and/or C              |

---

## State

**`studiedPhases`** — a Set of topic IDs the user has marked as studied.
A Set is used because it automatically prevents duplicates.

**`activeFilter`** — the currently selected safety class filter (`"all"`, `"A"`,
`"B"`, or `"C"`). Starts as `"all"`.

**`activeLevel`** — the currently selected training depth (`"intro"` or `"advanced"`).
Starts as `"intro"`. Persisted to `localStorage` so it survives page reloads and
is readable by the quiz page when printing the certificate.

---

## Functions

---

### `loadPhases()`  *(async)*

Downloads the topic data and renders it. Contains no error handling of its own —
errors are deliberately left to propagate to `initPhases()`, which is the only
place that knows where on the page to show a message.

```
START BOTH OF THESE AT THE SAME TIME and wait for both to finish:
      A) fetch and parse data/phases.json
      B) a 250ms pause

    — running them concurrently means the total wait is the LONGER of the two,
      not the sum. Written as two separate waits, the pause would not start
      until the download had finished.
    — the pause exists so a fast load cannot make the spinner flash on and
      off within a couple of frames, which reads as a glitch rather than
      as progress.
    — if the fetch fails, the wait ends immediately; it does not sit out
      the remaining pause.

IF the result is not a non-empty array:
    RAISE an error naming the file
        — the file could be valid JSON yet still the wrong shape;
          checking here means the rest of the code can trust the data

STORE the result in phases
CALL renderPhases
```

---

### `initPhases()`  *(async)*

Wraps `loadPhases()` with the user-facing state handling. This is where the three
states of an asynchronous operation become three branches of real code.

```
— STATE 1: LOADING —
SHOW the spinner
HIDE any error panel left over from a previous attempt
HIDE the controls bar
    — offering a "filter by class" button before there is anything
      to filter would mislead the user

TRY:
    WAIT for loadPhases to finish
        — this pauses initPhases only; the page stays scrollable and
          responsive, and other event handlers still run

    — STATE 2: SUCCESS —
    HIDE the spinner
    SHOW the controls bar

CATCH any error:
    — STATE 3: FAILURE —
    HIDE the spinner
    SHOW the error panel with the error's message text
    LOG the full error to the console for debugging

    — one CATCH covers every possible failure in the whole sequence:
      no network, a 404, malformed JSON, or the wrong data shape.
      That is the main practical advantage over chained .then() calls.
```

---

### `renderPhases()`

Called once the data has loaded. Builds all 13 topic cards from the current state
(`activeLevel`, `activeFilter`, `studiedPhases`) and inserts them into the grid.

```
CLEAR the phases grid

FOR EACH phase in the phases array:

    CREATE a card div
    SET its ID to "phase-{id}"

    IF this phase is already in studiedPhases:
        ADD "studied" style to the card

    BUILD class badges  — one coloured badge per safety class letter

    IF activeLevel is "advanced":
        USE phase.advancedDetails for the bullet list
    ELSE:
        USE phase.introDetails for the bullet list

    BUILD detail items  — one list item per bullet point

    SET the card's inner HTML to:
        ┌─ phase-header (role=button, aria-expanded=false) ──────────┐
        │  icon | clause | title | summary | class badges | chevron  │
        └────────────────────────────────────────────────────────────┘
        ┌─ phase-details (hidden until expanded) ────────────────────┐
        │  bullet point list                                          │
        └────────────────────────────────────────────────────────────┘
        ┌─ phase-footer ──────────────────────────────────────────────┐
        │  "✓ Studied" badge  |  "Mark as Studied" button            │
        └─────────────────────────────────────────────────────────────┘

    ADD the finished card to the grid

SET the total topic count display to phases.length
CALL applyFilter with the current activeFilter
CALL updateProgress
```

> **Note:** Event listeners are NOT attached here — they are attached once in the
> init block. This avoids duplicate listeners if renderPhases were ever called again.

---

### `updateDetailsContent()`

Swaps the bullet-point content inside every card **without rebuilding the DOM**.
Called whenever the level toggle changes.

Safe to call before the data has loaded: `phases` is empty at that point, so the
loop simply does nothing.

```
FOR EACH phase in the phases array:

    FIND the existing details panel for this phase ("phase-details-{id}")
    FIND the <ul> list inside it

    IF activeLevel is "advanced":
        USE phase.advancedDetails
    ELSE:
        USE phase.introDetails

    REPLACE the <ul>'s children with new <li> elements from the chosen array
```

> **Why not just call renderPhases() again?** Rebuilding the entire grid would
> reset all expanded/collapsed states and wipe the user's studied progress.
> Updating only the bullet list preserves everything else.

---

### `setLevel(level)`

Called when the user clicks the Introductory or Advanced button.

```
SET activeLevel to level

SAVE level to localStorage under key "62304_trainingLevel"
    — localStorage persists across page reloads and across pages,
      so the quiz page can read the same value when printing the certificate

FOR EACH level button:
    IF its data-level matches level:
        MARK it as active (filled background)
    ELSE:
        REMOVE active style

CALL updateDetailsContent  — swap bullet text in all cards
```

---

### `handleCardClick(event)`

Single click handler for the entire grid (event delegation).
Identifies which "zone" of the card was clicked and routes accordingly.

```
GET the closest "Mark as Studied" button to the clicked element
GET the closest phase header to the clicked element

IF a "Mark as Studied" button was clicked:
    CALL markStudied with that button's topic ID
    STOP  (prevent the header toggle from also firing)

IF a phase header was clicked:
    CALL togglePhaseCard with that header's topic ID
```

---

### `togglePhaseCard(id)`

Expands or collapses a single topic card.

```
FIND the card element with ID "phase-{id}"

IF the card exists:
    TOGGLE the "expanded" class on the card
        — CSS shows the details panel when "expanded" is present
        — CSS hides it when "expanded" is absent

    UPDATE aria-expanded on the header
        — SET to "true"  if the card is now expanded
        — SET to "false" if the card is now collapsed
```

---

### `markStudied(id)`

Marks a topic as studied and updates the progress bar.

```
IF this topic ID is already in studiedPhases:
    STOP  (guard against marking twice)

ADD the topic ID to studiedPhases
FIND the card element

ADD the "studied" style to the card  (green left border)

FIND the "Mark as Studied" button inside the card
    SET its label to "✓ Studied"
    DISABLE it so it cannot be clicked again

CALL updateProgress
```

---

### `applyFilter(classFilter)`

Shows only the cards that apply to the selected safety class.

```
SET activeFilter to classFilter

FOR EACH filter button:
    IF its filter value matches classFilter:
        MARK it as active (highlighted)
    ELSE:
        REMOVE active style

FOR EACH phase in the phases array:
    IF classFilter is "all"
    OR the phase's classes array includes classFilter:
        SHOW the card
    ELSE:
        HIDE the card
```

> **Why this works:** Class C software must follow all 13 process areas.
> Class A only needs the subset where `classes` includes `"A"`.

---

### `updateProgress()`

Recalculates and renders the progress bar after any study state change.

```
COUNT  = number of IDs in studiedPhases
TOTAL  = number of phases
PCT    = (COUNT / TOTAL) × 100

UPDATE the "X of 13" count display to COUNT
SET the progress bar width to PCT%
UPDATE aria-valuenow on the progress bar container to PCT
    (keeps the bar readable by screen readers)
```

---

### Initialisation (DOMContentLoaded)

Runs after the HTML is fully parsed.

All the controls are wired up FIRST and the data request is started LAST. That
ordering is deliberate: it means the page is interactive *during* the load rather
than only after it.

```
ON page load:

    READ "62304_trainingLevel" from localStorage
        IF the stored value is "advanced":
            SET activeLevel to "advanced"
        (if nothing is stored — first visit — activeLevel stays "intro")
        — read before the data arrives, so renderPhases shows the
          correct bullet set from the very first paint

    FOR EACH level button (Introductory / Advanced):
        MARK it as active if its data-level matches activeLevel
        (syncs the button highlight to match the restored level)

    ATTACH one click listener to the grid
        — handles expand/collapse and mark-as-studied for all 13 cards
        — event delegation is also what allows this listener to be attached
          BEFORE the cards exist: it lives on the container, which is
          already in the HTML, so cards added later are covered automatically
    ATTACH one keydown listener to the grid
        — handles Enter and Space on card headers for keyboard users

    FOR EACH filter button (All / Class A / Class B / Class C):
        ON click: CALL applyFilter with that button's filter value

    FOR EACH level button (Introductory / Advanced):
        ON click: CALL setLevel with that button's data-level value
        — if clicked while the download is still in flight, the choice is
          recorded and renderPhases picks it up when the data arrives

    ON click of the "Try again" button:
        CALL initPhases
        — re-attempts a failed load without discarding everything else
          the user has done on the page

    REVEAL the update banner unless previously dismissed

    CALL initPhases                     ← starts the download
        — NOT waited for: there is nothing left to do afterwards, and
          initPhases already handles its own errors internally
```

---

## Key Patterns

| Pattern | Where used | Why |
|---|---|---|
| **Async data loading** | `loadPhases`, `initPhases` | Content is fetched from JSON at runtime, with loading, success and failure all handled explicitly |
| **`Promise.all` for concurrency** | `loadPhases` | Runs the download and the anti-flicker pause together, so the total wait is the longer one rather than the sum |
| **Validation at the boundary** | `loadPhases` | External data is shape-checked as it enters, so everything downstream can trust it |
| **Errors handled where they can be acted on** | `loadPhases` raises, `initPhases` catches | The loader has no `try`/`catch`; only the caller knows where to display a message |
| **Data-driven rendering** | `renderPhases` | Content lives in a data file; adding a topic requires no HTML or JS changes |
| **In-place DOM update** | `updateDetailsContent` | Level toggle swaps only the bullet list, preserving expanded state and studied progress |
| **localStorage for cross-page state** | `setLevel`, init, `quiz.js` | Training level chosen on the Learn page is available to the Quiz page when printing the certificate |
| **Event delegation** | `handleCardClick`, keydown listener | One listener on the grid covers all 13 cards efficiently |
| **Set for unique state** | `studiedPhases` | Prevents duplicate entries without extra checks |
| **ARIA sync** | `togglePhaseCard`, `updateProgress` | Keeps screen reader state in step with the visual state |
