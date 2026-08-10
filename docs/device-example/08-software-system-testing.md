# 08 — Software System Testing (Device Example)

**Clause:** 5.7 — Software System Testing · **Register:** [Device Example Register](README.md)

**Document ID:** SOP-08 · **Device:** SentinelFlow 500 (fictional) · **Safety class:** C
**Status:** SOP — template (Procedure not yet written for SentinelFlow 500)

> **Fictional worked example.** See [SOP-01](01-general-requirements-and-classification.md)
> for the disclaimer that applies to this whole document set, and the
> [Device Example Register](README.md) for the SentinelFlow 500 device
> description and what "template" status means here.

## 1. Purpose

This SOP defines how SentinelFlow 500's complete software system is tested
against every documented software requirement, per Clause 5.7.

## 2. Scope

Applies to system testing of SentinelFlow 500's control software (Class C —
see [SOP-01 §7.3](01-general-requirements-and-classification.md#73-software-safety-classification-43)).
Covers Clause 5.7 in full. Every sub-clause of 5.7 applies to all three
safety classes — Amendment 1 moved §5.7.1–5.7.4 from Class B/C to all
classes, and §5.7.5 is treated as all-classes on the grounds recorded in
`applicability.json`'s `_resolvedItems` (see the site's Learn page for that
reasoning in full).

## 3. Responsibilities

| Role | Responsibility under this SOP |
|---|---|
| Test Lead | Establishes the system test set; executes tests and records results |
| Software Development Lead | Maintains traceability between requirements and tests |
| QA/RA | Evaluates test results against pass/fail criteria; confirms retesting after changes |

## 4. Definitions & Abbreviations

| Term | Meaning |
|---|---|
| System testing | Testing the complete, integrated software system against its documented requirements |
| Traceability | The recorded link from a software requirement to the test(s) that verify it |

## 5. References

- IEC 62304:2006+AMD1:2015, §5.7
- **SOP-03 — Software Requirements Specification**: the requirements this
  test set is written against
- **SOP-13 — Software Problem Resolution Process**: anomalies found during
  system testing are managed through this process

## 6. What the standard requires

| Ref | Title | Applies at Class C | What must be produced |
|---|---|---|---|
| 5.7.1 | Establish tests for software requirements | Yes | A set of tests covering all software requirements, expressed as input stimuli, expected outcomes, pass/fail criteria and procedures |
| 5.7.2 | Use software problem resolution process | Yes | (No standard-named output.) |
| 5.7.3 | Retest after changes | Yes | (No standard-named output.) |
| 5.7.4 | Evaluate software system testing | Yes | Recorded traceability between software requirements and the tests or other verification, plus evidence that results meet the pass/fail criteria |
| 5.7.5 | Software system test record contents | Yes | Software system test records: reference to test case procedures, the result and anomalies, the software version tested, the hardware and software test configuration, test tools, date, and the identity of the person responsible |

(Quoted directly from `applicability.json`, identical in content to the
self-referential set's [08](../08-software-system-testing.md), whose Status
is itself marked "Documented — strong evidence".)

## 7. Procedure

*Not yet written for SentinelFlow 500 — see the [Device Example Register](README.md)
for what "template" status means. Once complete, this section would give
SentinelFlow 500's actual system test set — e.g. dose-rate boundary tests,
occlusion-alarm response-time tests, free-flow prevention tests during a
simulated set change — with pass/fail criteria and full traceability back
to the requirements in SOP-03.*

### 5.7.1 — Establish tests for software requirements

**[Template.]**

### 5.7.2–5.7.3 — Problem resolution and retesting

**[Template — see SOP-13.]**

### 5.7.4 — Evaluate software system testing (traceability)

**[Template.]**

### 5.7.5 — Test record contents

**[Template.]**

## 8. Records

| Record | Produced by | Retained in |
|---|---|---|
| System test set (procedures, expected results) | Test Lead | Project technical file |
| System test records, per requirement | Test Lead | Project technical file |
| Requirements-to-test traceability matrix | Software Development Lead | Project technical file |

## 9. Revision History

*Illustrative only — SentinelFlow 500 has no real revision history.*

| Version | Status | Description |
|---|---|---|
| 1.0 | Template | Structure and requirements table complete; Procedure section pending |
