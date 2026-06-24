# learn.js — Pseudocode

## Overview

This file drives the Learn page. It builds 13 expandable topic cards from a
data array, handles expand/collapse and keyboard interaction, lets the user
toggle between Introductory and Advanced content, filter cards by safety class,
and tracks study progress with a progress bar.

---

## Data

**`phases`** — an array of 13 objects, one per IEC 62304 process area (Clauses 4–9).
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

### `renderPhases()`

Called once on page load. Builds all 13 topic cards from the current state
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

```
ON page load:

    READ "62304_trainingLevel" from localStorage
        IF the stored value is "advanced":
            SET activeLevel to "advanced"
        (if nothing is stored — first visit — activeLevel stays "intro")

    CALL renderPhases
        — builds all 13 cards using the restored activeLevel

    FOR EACH level button (Introductory / Advanced):
        MARK it as active if its data-level matches activeLevel
        (syncs the button highlight to match the restored level)

    ATTACH one click listener to the grid
        — handles expand/collapse and mark-as-studied for all 13 cards
    ATTACH one keydown listener to the grid
        — handles Enter and Space on card headers for keyboard users

    FOR EACH filter button (All / Class A / Class B / Class C):
        ON click: CALL applyFilter with that button's filter value

    FOR EACH level button (Introductory / Advanced):
        ON click: CALL setLevel with that button's data-level value
```

---

## Key Patterns

| Pattern | Where used | Why |
|---|---|---|
| **Data-driven rendering** | `renderPhases` | Content lives in a JS array; adding a topic requires no HTML changes |
| **In-place DOM update** | `updateDetailsContent` | Level toggle swaps only the bullet list, preserving expanded state and studied progress |
| **localStorage for cross-page state** | `setLevel`, init, `quiz.js` | Training level chosen on the Learn page is available to the Quiz page when printing the certificate |
| **Event delegation** | `handleCardClick`, keydown listener | One listener on the grid covers all 13 cards efficiently |
| **Set for unique state** | `studiedPhases` | Prevents duplicate entries without extra checks |
| **ARIA sync** | `togglePhaseCard`, `updateProgress` | Keeps screen reader state in step with the visual state |
