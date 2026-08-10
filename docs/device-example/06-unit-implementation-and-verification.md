# 06 — Unit Implementation and Verification (Device Example)

**Clause:** 5.5 — Unit Implementation and Verification · **Register:** [Device Example Register](README.md)

**Document ID:** SOP-06 · **Device:** SentinelFlow 500 (fictional) · **Safety class:** C
**Status:** SOP — template (Procedure not yet written for SentinelFlow 500)

> **Fictional worked example.** See [SOP-01](01-general-requirements-and-classification.md)
> for the disclaimer that applies to this whole document set, and the
> [Device Example Register](README.md) for the SentinelFlow 500 device
> description and what "template" status means here.

## 1. Purpose

This SOP defines how each software unit in SentinelFlow 500's detailed
design is implemented and verified against its design specification, per
Clause 5.5.

## 2. Scope

Applies to implementation and unit verification of SentinelFlow 500's
control software (Class C — see [SOP-01 §7.3](01-general-requirements-and-classification.md#73-software-safety-classification-43)).
Covers Clause 5.5 in full, including the additional acceptance criteria
(§5.5.4) that apply only at Class C.

## 3. Responsibilities

| Role | Responsibility under this SOP |
|---|---|
| Software Development Lead | Defines the coding standard; establishes acceptance criteria before implementation |
| Developers | Implement each software unit to its detailed design; perform or support unit verification |
| QA/RA | Confirms unit verification evidence is retained as objective evidence |

## 4. Definitions & Abbreviations

| Term | Meaning |
|---|---|
| Unit verification | Confirming a software unit meets its detailed design, by review, static analysis, testing, or a combination |
| Acceptance criteria | The pass/fail conditions a software unit must meet before integration, established before implementation for Class C |

## 5. References

- IEC 62304:2006+AMD1:2015, §5.5
- **SOP-05 — Software Detailed Design**: the specification each unit is
  implemented and verified against
- **SOP-13 — Software Problem Resolution Process**: any anomaly found during
  unit verification is managed through this process, not fixed silently

## 6. What the standard requires

| Ref | Title | Applies at Class C | What must be produced |
|---|---|---|---|
| 5.5.1 | Implement each software unit | Yes | Implemented software units |
| 5.5.2 | Establish software unit verification process | Yes | Strategies, methods and procedures for verifying the software units, with test procedures evaluated for adequacy where verification is by testing |
| 5.5.3 | Software unit acceptance criteria | Yes | Acceptance criteria for software units, established before integration, and evidence the units meet them |
| 5.5.4 | Additional software unit acceptance criteria | Yes | Additional acceptance criteria where present in the design: event sequence, data and control flow, resource allocation, fault handling, variable initialisation, self-diagnostics, memory management and boundary conditions |
| 5.5.5 | Software unit verification | Yes | Documented results of software unit verification |

(Quoted directly from `applicability.json`, identical in content to the
self-referential set's [06](../06-unit-implementation-and-verification.md),
whose Status is itself marked **Partial** — that project does not do
isolated unit testing of its JavaScript. This device-example set's version
is a template for the same clause, not a completed alternative.)

## 7. Procedure

*Not yet written for SentinelFlow 500 — see the [Device Example Register](README.md)
for what "template" status means. Once complete, this section would give
SentinelFlow 500's coding standard, its unit verification strategy (review,
static analysis, and/or test), and the acceptance criteria for
safety-critical units such as dose-rate validation and occlusion detection.*

### 5.5.1 — Implement each software unit

**[Template.]**

### 5.5.2–5.5.3 — Unit verification process and acceptance criteria

**[Template.]**

### 5.5.4 — Additional acceptance criteria (Class C)

**[Template.]**

### 5.5.5 — Unit verification results

**[Template — anomalies found here would be logged per SOP-13.]**

## 8. Records

| Record | Produced by | Retained in |
|---|---|---|
| Coding standard | Software Development Lead | Project technical file |
| Unit verification results, per unit | Developers | Project technical file |

## 9. Revision History

*Illustrative only — SentinelFlow 500 has no real revision history.*

| Version | Status | Description |
|---|---|---|
| 1.0 | Template | Structure and requirements table complete; Procedure section pending |
