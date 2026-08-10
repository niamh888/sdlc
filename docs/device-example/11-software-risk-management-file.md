# 11 — Software Risk Management File (Device Example)

**Clause:** 7 — Software Risk Management · **Register:** [Device Example Register](README.md)

**Document ID:** SOP-11 · **Device:** SentinelFlow 500 (fictional) · **Safety class:** C
**Status:** SOP — partial worked example (hazard analysis drafted; risk control verification and traceability not yet written)

> **Fictional worked example.** See [SOP-01](01-general-requirements-and-classification.md)
> for the disclaimer that applies to this whole document set, and the
> [Device Example Register](README.md) for the SentinelFlow 500 device
> description and what "template" status means here.

## 1. Purpose

This SOP defines how software items that could contribute to a hazardous
situation are identified, how their risk is evaluated and controlled, and
how those activities integrate with the ISO 14971 device risk management
process, per Clause 7. It is the SOP the classification rationale in
[SOP-01 §7.3](01-general-requirements-and-classification.md#73-software-safety-classification-43)
is drawn from.

## 2. Scope

Applies to all software items in SentinelFlow 500's control software (Class
C — see SOP-01 §7.3). Covers Clause 7 in full. §7.4.1 (analyse changes to
the software with respect to safety) is the only requirement in Clause 7
that applies at Class A; every other sub-clause applies at Class B and C
only, since a Class A software item cannot by definition contribute to a
hazardous situation.

## 3. Responsibilities

| Role | Responsibility under this SOP |
|---|---|
| Risk Manager | Owns the risk management file; integrates software risk activities with the device-level ISO 14971 process |
| Software Development Lead | Identifies software items and their potential causes of contribution to a hazardous situation |
| QA/RA | Confirms verification of risk control measures is documented before release |

## 4. Definitions & Abbreviations

| Term | Meaning |
|---|---|
| Hazard | A potential source of harm (e.g. incorrect dose delivered) |
| Hazardous situation | The circumstance in which a person is exposed to a hazard (e.g. patient receives the incorrect dose) — the Amendment 1 terminology this SOP uses throughout |
| Risk control measure | An action implemented in software to reduce the probability or severity of a hazardous situation |

## 5. References

- IEC 62304:2006+AMD1:2015, Clause 7
- ISO 14971 — the device-level risk management process this file feeds
- **SOP-01 — General Requirements & Classification**: the classification
  this file's hazard analysis supports
- **SOP-03 — Software Requirements Specification**: where risk control
  measures identified here are implemented as requirements (§5.2.3)

## 6. What the standard requires

| Ref | Title | Applies at Class C | What must be produced |
|---|---|---|---|
| 7.1.1 | Identify software items that could contribute to a hazardous situation | Yes | (No standard-named output.) |
| 7.1.2 | Identify potential causes of contribution to a hazardous situation | Yes | (No standard-named output.) |
| 7.1.3 | Evaluate published SOUP anomaly lists | Yes | (No standard-named output.) |
| 7.1.4 | Document potential causes | Yes | Potential causes of the software item contributing to a hazardous situation, documented in the risk management file |
| 7.1.5 | Deleted by Amendment 1 | No — deleted | — |
| 7.2.1 | Define risk control measures | Yes | Documented risk control measures for each case where a software item could contribute to a hazardous situation |
| 7.2.2 | Risk control measures implemented in software | Yes | Risk control measures included in the software requirements, with a safety class assigned to each implementing software item |
| 7.3.1 | Verify risk control measures | Yes | Documented verification of each risk control measure, and a review of whether it could itself result in a new hazardous situation |
| 7.3.2 | Not used (Amendment 1) | No — deleted | — |
| 7.3.3 | Document traceability | Yes | Documented traceability from hazardous situation to software item, to software cause, to risk control measure, to verification of that measure |
| 7.4.1 | Analyse changes to medical device software with respect to safety | Yes (only Clause 7 requirement reaching Class A) | Analysis of changes to the software, including SOUP, for additional potential causes and additional risk control measures needed |
| 7.4.2 | Analyse impact of software changes on existing risk control measures | Yes | Analysis of whether software changes, including SOUP changes, could interfere with existing risk control measures |
| 7.4.3 | Perform risk management activities based on analyses | Yes | (No standard-named output.) |

(Quoted directly from `applicability.json`, identical in content to the
self-referential set's [11](../11-software-risk-management-file.md), whose
Status is itself marked "Documented — reflexive": that document uses risk
management to describe the risk of teaching a reader something wrong,
rather than patient harm — the gap this device-example version exists to
fill.)

## 7. Procedure

### 7.1 — Hazard analysis (§7.1.1–7.1.4)

The three failure modes already reasoned through in
[SOP-01 §7.3](01-general-requirements-and-classification.md#73-software-safety-classification-43)
to justify Class C form the starting hazard analysis for the delivery-control
software item:

| # | Software cause | Hazardous situation | Potential harm | Risk control measure (§7.2.1) |
|---|---|---|---|---|
| H-1 | Occlusion-sensor software path fails to raise an alarm on a blocked line | Time-critical drug (e.g. vasoactive infusion) silently stops reaching the patient | Death or serious injury, depending on drug | Independent software watchdog on the occlusion-sensor read path; audible + visual alarm within a bounded response time |
| H-2 | Software fails to keep the motor stopped when it should be closed (e.g. during a pause, or set change) | Free-flow over-infusion — the reservoir empties into the patient far faster than programmed | Death or serious injury | Software-enforced motor lock during any non-delivering state; state confirmed by sensor feedback, not command alone |
| H-3 | Parameter validation fails to catch a rate outside the configured safe range for the selected drug profile | Order-of-magnitude dosing error delivered as if correct | Death or serious injury | Dose-rate validation against a configurable per-profile safe range before delivery starts, rejecting out-of-range programming |

Each of these is the sole software-level control between a plausible
failure and patient harm, which is the Class C condition applied in SOP-01.
§7.1.3 (evaluate published SOUP anomaly lists) has no entries yet: no SOUP
component has been identified in the architecture (SOP-04 is itself still a
template), so there is nothing to evaluate against published anomaly lists
until that section is written.

### 7.2–7.3 — Risk control measures, their implementation, and verification

**[Template — the risk control measures in the table above are named but
not yet carried through to specific software requirements (SOP-03) or
verified (§7.3.1). Traceability (§7.3.3) from hazardous situation → software
item → cause → control → verification cannot be completed until SOP-03 and
SOP-04 are written.]**

### 7.4 — Change analysis

**[Template — no software change has occurred yet for SentinelFlow 500 to
analyse.]**

## 8. Records

| Record | Produced by | Retained in |
|---|---|---|
| Hazard analysis (§7.1) | Risk Manager | This risk management file |
| Risk control measure verification (§7.3.1), once written | Risk Manager | This risk management file |
| Traceability matrix (hazard → cause → control → verification), once written | Risk Manager | This risk management file |

## 9. Revision History

*Illustrative only — SentinelFlow 500 has no real revision history.*

| Version | Status | Description |
|---|---|---|
| 1.0 | Partial | Hazard analysis (§7.1) drafted for the three failure modes underlying the Class C classification; risk control verification and traceability pending |
