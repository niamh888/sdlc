# 03 — Software Requirements Specification

**Clause:** 5.2 — Software Requirements Analysis · **Register:** [docs/README.md](README.md)

> **Example artefact — training use only.** This project is a training
> site, not a real medical device under any regulatory definition, and
> nothing here is a genuine IEC 62304 deliverable. It illustrates the
> *kind* of document a Software-as-a-Medical-Device (SaMD) or
> Software-in-a-Medical-Device (SiMD) project would produce for this
> process area — see [docs/README.md](README.md#what-this-is-and-is-not)
> for the full picture.

## What the standard requires (Class C — every sub-clause of 5.2)

| Ref | Title | Applies at | Output |
|---|---|---|---|
| 5.2.1 | Define and document requirements from system requirements | A, B, C | Documented software system requirements, derived from system-level requirements |
| 5.2.2 | Software requirements content | A, B, C | Functional/capability, inputs/outputs, interfaces, alarms/messages, security, UI, data/database, installation/acceptance, operation/maintenance, IT-network, regulatory |
| 5.2.3 | Include risk control measures in requirements | **B, C** | Risk control measures implemented in software, included in the requirements |
| 5.2.4 | Re-evaluate medical device risk analysis | A, B, C | Re-evaluated and updated medical device risk analysis |
| 5.2.5 | Update requirements | A, B, C | Re-evaluated and updated requirements, including system requirements |
| 5.2.6 | Verify software requirements | A, B, C | Documented verification that requirements implement system requirements, don't contradict, avoid ambiguity, are testable, unique and traceable |

## 5.2.1 — Where these requirements come from

There is no separate "system" here (see [02 §5.1.3](02-software-development-plan.md)),
so the nearest equivalent to a system requirements specification is: **the
content of the standard itself.** IEC 62304's own text is the source; this
project's requirements are "present that content correctly, accessibly, and
interactively," derived and reviewed the way [11](11-software-risk-management-file.md)
describes.

## 5.2.2 — Requirements, by page

Each requirement below is written the way the standard's own content list at
5.2.2 asks for — functional, interface, or otherwise — and points at the
[`tests/test_site.py`](../tests/test_site.py) group that verifies it, which
is the verification method for 5.2.6.

### Cross-page

| ID | Requirement | Verified by (test group) |
|---|---|---|
| REQ-01 | The site states which edition of IEC 62304 it covers, on every page, and states that Edition 2 is not covered | `version` |
| REQ-02 | Visitors can switch between light and dark colour themes; the choice persists across visits and is not overridden by a later system-theme change | `theme` |
| REQ-03 | No page flashes the wrong theme on load | `theme` |
| REQ-04 | All five pages meet WCAG 2.1 A/AA and axe-core best-practice rules, in both themes | `a11y` |
| REQ-05 | All five pages remain usable with no horizontal overflow at 1280/768/480/360px and at a 200% zoom equivalent | `responsive` |
| REQ-06 | Every page links to the privacy notice from its footer | `privacy` |

### Home (`index.html`)

| ID | Requirement | Verified by |
|---|---|---|
| REQ-07 | States the standard's edition and that Edition 2 is not covered, in the hero content | `version` |
| REQ-08 | Shows the topic count sourced from the same data the Learn page renders, not a separate hardcoded figure | `privacy` (home page topic count matches the data) |

### Learn (`learn.html`)

| ID | Requirement | Verified by |
|---|---|---|
| REQ-09 | Renders one card per topic from `data/phases.json`, asynchronously, with loading/error/retry states | `learn` |
| REQ-10 | Each card expands/collapses by mouse and keyboard (Enter/Space), with `aria-expanded` kept correct | `learn` |
| REQ-11 | A level toggle (Introductory/Advanced) swaps bullet content in place without losing expanded or studied state; the choice persists to `localStorage` | `learn` |
| REQ-12 | A safety-class filter (A/B/C/all) shows/hides cards using the sub-clause data, not a hardcoded per-clause list, and flags partially-applicable cards | `applicability` |
| REQ-13 | Selecting a class reveals a live-region notice naming every omitted or partially-applicable area and why, including a standing ISO 14971 caution | `learn` |
| REQ-14 | Selecting a class generates a deliverables list (on screen, CSV, and print) of the documented outputs required at that class | `deliverables` |
| REQ-15 | The site refuses to render Learn content if `phases.json` and `applicability.json` disagree on a clause's classes, and names the disagreement | `applicability` |
| REQ-16 | A progress tracker lets a visitor mark topics as studied and shows a running count | `learn` |

### Quiz (`quiz.html`)

| ID | Requirement | Verified by |
|---|---|---|
| REQ-17 | Two 15-question sets (Introductory/Advanced); only the set matching the visitor's chosen level is downloaded | `quiz` |
| REQ-18 | Questions are presented in randomised order with a 30-second per-question timer and immediate feedback | `quiz` |
| REQ-19 | An 80% pass mark produces a certificate reflecting the training level completed, downloadable and print-formatted | `quiz` |
| REQ-20 | A timed-out or failed run is handled explicitly, not just a passing run | `quiz` |

### Contact (`contact.html`)

| ID | Requirement | Verified by |
|---|---|---|
| REQ-21 | Client-side validation runs on blur and on submit, per field | `contact` |
| REQ-22 | Submission is asynchronous (no page reload), with a "Sending…" state, a request timeout, and field-level error reporting for a 422 response | `contact` |
| REQ-23 | A double-submit is prevented while a request is in flight | `contact` |
| REQ-24 | A hidden honeypot field deters spam without being visible or reachable by a real visitor | `contact` |

### Privacy (`privacy.html`)

| ID | Requirement | Verified by |
|---|---|---|
| REQ-25 | Names what the contact form collects, the transfer to Formspree (US), the retention period, and how to contact the supervisory authority | `privacy` |
| REQ-26 | States the provenance of the course content, the safety-class mapping, and the Edition 2 status, and disclaims any IEC affiliation | `privacy` |

## 5.2.3 — Risk control measures included in the requirements

The one place a genuine "risk" exists in this project is content correctness
(see [11](11-software-risk-management-file.md)). The control measure is
REQ-15 above — the site's refusal to render on contradictory safety-class
data — which is itself a requirement, not just an implementation detail, for
exactly that reason.

## 5.2.4–5.2.5 — Re-evaluation

Each of the three logged content defects described in
[11 — Risk Management File](11-software-risk-management-file.md) triggered a
re-evaluation of the requirements above (specifically REQ-12 and REQ-15,
which did not exist before the defects were found) — this is that process's
paper trail.

## 5.2.6 — Requirements verification

Verification method, per requirement, is the test group named in the tables
above. This is coarser than the "verify every requirement individually" a
formal SRS review would produce — the granularity available is *group*, not
*case*, and that is recorded here rather than implied to be finer than it is.

## Gaps

- Requirements are traced to test **groups**, not individual test cases —
  the check labels inside [`tests/test_site.py`](../tests/test_site.py) are
  the case-level detail, but there is no separate traceability matrix
  connecting REQ-IDs to specific `R.check(...)` calls. For a project this
  size the group-level mapping above is proportionate; it would not be for a
  larger one.
- This document was written **after** the features it describes, not before
  them — for a real Class C project 5.2.1 expects requirements to exist
  before implementation. That ordering gap is itself an example of the kind
  of finding [13 — Problem Resolution](13-software-problem-resolution.md)
  exists to catch and record, not just a footnote.
