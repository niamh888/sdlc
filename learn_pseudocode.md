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

| Field     | Description                                              |
|-----------|----------------------------------------------------------|
| `id`      | Unique slug used to build element IDs (e.g. `planning`) |
| `clause`  | Standard reference (e.g. `Clause 5.1`)                  |
| `title`   | Process area name                                        |
| `icon`    | Emoji displayed on the card header                       |
| `summary` | One-sentence description shown without expanding         |
| `details` | Array of bullet points revealed when card is expanded    |
| `classes` | Safety classes this process applies to: A, B, and/or C  |

---

## State

**`studiedPhases`** — a Set of phase IDs the user has marked as studied.
A Set is used because it automatically prevents duplicates.

**`activeFilter`** — the currently selected filter value (`"all"`, `"A"`,
`"B"`, or `"C"`). Starts as `"all"`.

---

## Functions

---

### `renderPhases()`

Called once on page load. Builds all cards and attaches event listeners.

```
CLEAR the phases grid

FOR EACH phase in the phases array:

    CREATE a card div
    SET its ID to "phase-{id}"

    IF this phase is already in studiedPhases:
        ADD "studied" style to the card

    BUILD class badges  — one coloured badge per safety class letter
    BUILD detail items  — one list item per detail bullet point

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

SET the total phase count display to phases.length
CALL applyFilter with the current activeFilter
CALL updateProgress

ATTACH one click listener to the grid (handles all 12 cards via delegation)
ATTACH one keydown listener to the grid (handles Enter and Space on headers)
```

---

### `handleCardClick(event)`

Single click handler for the entire grid (event delegation).
Identifies which "zone" of the card was clicked and routes accordingly.

```
GET the closest "Mark as Studied" button to the clicked element
GET the closest phase header to the clicked element

IF a "Mark as Studied" button was clicked:
    CALL markStudied with that button's phase ID
    STOP  (prevent the header toggle from also firing)

IF a phase header was clicked:
    CALL togglePhaseCard with that header's phase ID
```

---

### `togglePhaseCard(id)`

Expands or collapses a single phase card.

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

Marks a phase as studied and updates the progress bar.

```
IF this phase ID is already in studiedPhases:
    STOP  (guard against marking twice)

ADD the phase ID to studiedPhases
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

> **Why this works:** Class C software must follow all 12 process areas.
> Class A only needs the subset where `classes` includes `"A"`.

---

### `updateProgress()`

Recalculates and renders the progress bar after any study state change.

```
COUNT  = number of IDs in studiedPhases
TOTAL  = number of phases
PCT    = (COUNT / TOTAL) × 100

UPDATE the "X of 12" count display to COUNT
SET the progress bar width to PCT%
UPDATE aria-valuenow on the progress bar container to PCT
    (keeps the bar readable by screen readers)
```

---

### Initialisation (DOMContentLoaded)

Runs after the HTML is fully parsed.

```
ON page load:
    CALL renderPhases   — builds all cards and attaches grid listeners

    FOR EACH filter button (All / Class A / Class B / Class C):
        ON click:
            CALL applyFilter with that button's filter value
```

---

## Key Patterns

| Pattern | Where used | Why |
|---|---|---|
| **Data-driven rendering** | `renderPhases` | Content lives in a JS array; adding a phase requires no HTML changes |
| **Event delegation** | `handleCardClick`, keydown listener | One listener on the grid covers all 12 cards efficiently |
| **Set for unique state** | `studiedPhases` | Prevents duplicate entries without extra checks |
| **ARIA sync** | `togglePhaseCard`, `updateProgress` | Keeps screen reader state in step with the visual state |
