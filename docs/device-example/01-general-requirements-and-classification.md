# 01 — General Requirements & Classification (Device Example)

**Clause:** 4 — General Requirements · **Register:** [Device Example Register](README.md)

> **Fictional worked example.** The "SentinelFlow 500" ambulatory infusion
> pump described in this document set does not exist. It was invented for
> this course so a reader could see IEC 62304 documents written about an
> actual medical device — with real hazards, real essential performance,
> real hardware/software interfaces — which the site's other, self-referential
> document set cannot provide, since that one documents the training website
> itself, and a training website cannot harm anyone. See
> [that register](../README.md#what-this-is-and-is-not) for the reflexive
> set, and [this one](README.md) for what's different about this one.

## What the standard requires

| Ref | Title | Applies at Class C | What must be produced |
|---|---|---|---|
| 4.1 | Quality management system | Yes | See "seeAlso" note below — 4.1 has no `output` of its own; it is satisfied by pointing at a QMS. |
| 4.2 | Risk management | Yes | See "seeAlso" note below — satisfied by pointing at ISO 14971. |
| 4.3 | Software safety classification | Yes | "Software safety class of each software system and software item, recorded in the risk management file, with a rationale where an item is classified differently from its parent." |
| 4.4 | Legacy software | Yes | "Gap analysis against 5.2, 5.3, 5.7 and Clause 7; a plan to close the gaps, with software system test records as the minimum deliverable; and the legacy software version plus a documented rationale for its continued use." |

(Quoted directly from `applicability.json` — Clause 4 carries no per-requirement
`[Class ...]` tags in the standard itself; Table A.1 assigns all four
sub-clauses to every class. This table is identical to the one in the
self-referential set's [01](../01-general-requirements-and-classification.md) —
the *requirements* don't change with the device, only the answers do.)

## The device

**SentinelFlow 500** is a fictional ambulatory infusion pump for continuous
and intermittent delivery of intravenous medication in a hospital setting.
Clinical staff programme a flow rate, total volume, and duration; the pump
delivers to those parameters until complete, paused, or stopped. The
software under discussion in this document set is the pump's embedded
control software: it drives the delivery motor, reads the occlusion,
air-in-line and door-open sensors, validates programmed parameters against
configurable dose-rate limits before delivery starts, and drives the display
and alarms.

## 4.1 — Quality management system

The requirement is to demonstrate the ability to consistently meet customer
and applicable regulatory requirements, which the standard says can be shown
by an ISO 13485 QMS, a national QMS standard, or a QMS required by national
regulation (full text in `applicability.json`, `general-requirements` → `4.1`).

**For this fictional example:** assume SentinelFlow 500 is manufactured under
a certified ISO 13485 QMS, as any real infusion pump manufacturer would be
required to have. This document set does not — and cannot — demonstrate that
QMS in operation, because there is no real organisation behind a fictional
product to audit. That is stated here as an assumption the rest of this set
relies on, not as evidence being claimed.

## 4.2 — Risk management

The normative text requires a risk management process complying with ISO
14971, named as the single route with no alternative offered (unlike 4.1's
three routes). See [11 — Software Risk Management File](11-software-risk-management-file.md)
for the hazard analysis this document set uses — a real (if illustrative)
patient-risk analysis, unlike the self-referential set's version of the same
document, which uses risk management to describe the risk of teaching a
reader something wrong rather than patient harm.

## 4.3 — Software safety classification

This is the sub-clause the whole device-example set exists to demonstrate
properly.

**The test, as Amendment 1 states it** (from `data/phases.json`,
`general-requirements`): *"A software item that could contribute to a
hazardous situation must be Class B minimum; if it is the sole control
measure preventing serious injury or death, it must be Class C. Software
items that cannot contribute to any hazardous situation may be Class A."*

**Applying it to SentinelFlow 500's control software:** the software
directly controls a motor delivering medication into a patient's
bloodstream. Consider three credible failure modes:

- **Undetected occlusion.** A blocked line stops delivery; if the occlusion
  sensor's software path fails to raise the alarm, a time-critical drug
  (e.g. a vasoactive infusion) simply stops reaching the patient with no
  warning.
- **Free-flow over-infusion.** If the software fails to keep the motor
  stopped when it should be closed (e.g. during a pause, or while the
  administration set is being changed), gravity can free-flow the full
  reservoir into the patient far faster than programmed — a classic,
  well-documented infusion pump hazard.
- **Misprogrammed or misapplied rate.** If the software's parameter
  validation fails to catch a rate outside the configured safe range for
  the selected drug profile, an order-of-magnitude dosing error can be
  delivered exactly as "successfully" as a correct one.

In each case, the harm (death or serious injury, depending on the drug) is
severe, and — critically — **the software is the sole control measure**: there
is no independent mechanical flow limiter or hardware interlock downstream
of it that would catch these failures before they reach the patient. That is
exactly the condition the test names for Class C, not merely Class B.

**Result: Class C**, and unlike the self-referential set's 4.3 (where the
honest answer is "not applicable, Class C chosen only as a teaching target"),
this is a genuine classification reached by applying the test to a real
hazard picture — which is the entire reason this second document set exists.

**Gap:** a real risk management file would record this reasoning as
"rationale where an item is classified differently from its parent" per the
`output` text above. This section *is* that rationale, kept here rather than
duplicated in [11](11-software-risk-management-file.md), matching the
convention the self-referential set already uses.

## 4.4 — Legacy software

Not applicable. SentinelFlow 500 is presented as developed from a single
IEC 62304 lifecycle from inception, with no prior undocumented version on
the market — so there is no legacy software gap analysis to perform. Stated
as such rather than left blank, matching the convention used throughout
this document set (and the self-referential one) for genuinely inapplicable
sub-clauses.
