# 13 — Software Problem Resolution Process (Device Example)

**Clause:** 9 — Problem Resolution Process · **Register:** [Device Example Register](README.md)

**Document ID:** SOP-13 · **Device:** SentinelFlow 500 (fictional) · **Safety class:** C
**Status:** SOP — template (Procedure not yet written for SentinelFlow 500)

> **Fictional worked example.** See [SOP-01](01-general-requirements-and-classification.md)
> for the disclaimer that applies to this whole document set, and the
> [Device Example Register](README.md) for the SentinelFlow 500 device
> description and what "template" status means here.

## 1. Purpose

This SOP defines how every problem found in SentinelFlow 500's software —
during development, testing, or after release — is reported, investigated,
resolved, verified, and analysed for trends, per Clause 9. Every other SOP
in this set that finds an anomaly (SOP-06 through SOP-10) hands it to this
process rather than resolving it informally.

## 2. Scope

Applies to every problem detected in SentinelFlow 500's control software at
any lifecycle stage (Class C — see [SOP-01 §7.3](01-general-requirements-and-classification.md#73-software-safety-classification-43)).
Covers Clause 9 in full — every sub-clause applies to all three safety
classes.

## 3. Responsibilities

| Role | Responsibility under this SOP |
|---|---|
| Reporter (any role) | Prepares a problem report for each problem detected |
| Software Development Lead | Investigates the problem; determines a change request or documents a rationale for no action |
| Risk Manager | Evaluates each problem report's effect on safety |
| QA/RA | Verifies resolution closed the problem, introduced no new problems, and analyses trends across problem reports |

## 4. Definitions & Abbreviations

| Term | Meaning |
|---|---|
| Problem report | The record of a detected problem, including its criticality and information aiding resolution |
| Trend analysis | Reviewing problem data over time to detect a recurring, systemic design or process weakness |

## 5. References

- IEC 62304:2006+AMD1:2015, Clause 9
- **SOP-11 — Software Risk Management File**: updated whenever a resolved
  problem affects the risk picture (§9.5)
- **SOP-10 — Software Maintenance Plan**: the feedback channel that raises
  most post-release problem reports

## 6. What the standard requires

| Ref | Title | Applies at Class C | What must be produced |
|---|---|---|---|
| 9.1 | Prepare problem reports | Yes | A problem report for each problem detected, including a statement of criticality and information aiding resolution |
| 9.2 | Investigate the problem | Yes | Documented outcome of the investigation and evaluation, and either a change request or a documented rationale for taking no action |
| 9.3 | Advise relevant parties | Yes | (No standard-named output.) |
| 9.4 | Use change control process | Yes | (No standard-named output.) |
| 9.5 | Maintain records | Yes | Records of problem reports and their resolution including verification, and an updated risk management file |
| 9.6 | Analyse problems for trends | Yes | (No standard-named output.) |
| 9.7 | Verify software problem resolution | Yes | Verification that each resolution closed the problem, reversed adverse trends, was implemented in the right software and activities, and introduced no new problems |
| 9.8 | Test documentation contents | Yes | Test documentation for testing, retesting or regression testing after a change: results, anomalies, software version, hardware and software test configuration, test tools, date and tester |

(Quoted directly from `applicability.json`, identical in content to the
self-referential set's [13](../13-software-problem-resolution.md), whose
Status is itself marked "Documented — strong evidence".)

## 7. Procedure

*Not yet written for SentinelFlow 500 — see the [Device Example Register](README.md)
for what "template" status means. Once complete, this section would give
SentinelFlow 500's actual problem-report format, its criticality scale, and
worked examples of problems raised against the hazards identified in
SOP-11.*

### 9.1–9.2 — Prepare and investigate problem reports

**[Template.]**

### 9.3–9.4 — Advise relevant parties; use change control

**[Template — see SOP-12 for the change control process this section relies on.]**

### 9.5 — Maintain records

**[Template — see SOP-11, which this section keeps updated.]**

### 9.6–9.8 — Trend analysis, resolution verification, test documentation

**[Template.]**

## 8. Records

| Record | Produced by | Retained in |
|---|---|---|
| Problem reports | Reporter | Problem resolution log |
| Investigation and resolution records | Software Development Lead | Problem resolution log |
| Trend analysis | QA/RA | Problem resolution log |

## 9. Revision History

*Illustrative only — SentinelFlow 500 has no real revision history.*

| Version | Status | Description |
|---|---|---|
| 1.0 | Template | Structure and requirements table complete; Procedure section pending |
