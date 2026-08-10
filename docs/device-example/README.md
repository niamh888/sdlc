# Device Example Document Register

This folder is a **second**, parallel document set to the one in
[docs/](../README.md). Where that set documents this training website's own
development — real evidence, but about a website, not a device — this one
documents a fictional medical device, invented purely so a reader can see
what IEC 62304 paperwork looks like when it's actually about patient risk:
hazards, essential performance, alarms, a hardware/software interface. None
of it is real evidence of anything; all of it is illustrative.

## What this is, and is not

**SentinelFlow 500 does not exist.** It is a fictional ambulatory infusion
pump, invented for this course. Nothing in this folder is a real regulatory
submission, a real device's documentation, or evidence of any real
organisation's compliance with anything. See
[01 — General Requirements & Classification](01-general-requirements-and-classification.md)
for the device description and the classification reasoning this whole set
is built on.

## Why this set exists alongside the other one

The [self-referential set](../README.md) is genuinely useful — everything in
it is true, which a fabricated device's documentation cannot claim to be —
but it structurally cannot touch anything that depends on the software
actually being part of a medical device: hazardous situations, essential
performance, alarm conditions, hardware/software interfaces. This set exists
to cover exactly that gap. Read together, the two sets show a learner both
things: genuine traceability discipline (the reflexive set) and what
device-specific content actually looks like (this one).

## The document set

Same shape as the other set — one file per process area, in clause order —
built out incrementally. Status reflects what's been written so far, not
what's planned to exist eventually.

| # | Document | Clause | Status |
|---|---|---|---|
| [01](01-general-requirements-and-classification.md) | General Requirements & Classification | Clause 4 | Documented |
| 02 | Software Development Plan | Clause 5.1 | Planned |
| 03 | Software Requirements Specification | Clause 5.2 | Planned |
| 04 | Software Architecture | Clause 5.3 | Planned |
| 05 | Software Detailed Design | Clause 5.4 | Planned |
| 06 | Unit Implementation & Verification | Clause 5.5 | Planned |
| 07 | Software Integration & Testing | Clause 5.6 | Planned |
| 08 | Software System Testing | Clause 5.7 | Planned |
| 09 | Software Release | Clause 5.8 | Planned |
| 10 | Software Maintenance Plan | Clause 6 | Planned |
| 11 | Software Risk Management File | Clause 7 | Planned |
| 12 | Software Configuration Management Plan | Clause 8 | Planned |
| 13 | Software Problem Resolution Process | Clause 9 | Planned |

## Reading these documents

Same online/PDF pattern as the other set once the rendering pipeline is
extended to cover this folder (not done yet — see the main project's
`docs/render.py`). Until then, this folder is markdown-only.
