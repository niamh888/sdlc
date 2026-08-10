# 07 — Software Integration and Testing (Device Example)

**Clause:** 5.6 — Software Integration and Testing · **Register:** [Device Example Register](README.md)

**Document ID:** SOP-07 · **Device:** SentinelFlow 500 (fictional) · **Safety class:** C
**Status:** SOP — template (Procedure not yet written for SentinelFlow 500)

> **Fictional worked example.** See [SOP-01](01-general-requirements-and-classification.md)
> for the disclaimer that applies to this whole document set, and the
> [Device Example Register](README.md) for the SentinelFlow 500 device
> description and what "template" status means here.

## 1. Purpose

This SOP defines how SentinelFlow 500's software items are integrated in a
planned sequence and tested as they come together, per Clause 5.6.

## 2. Scope

Applies to integration of SentinelFlow 500's control software items (Class
C — see [SOP-01 §7.3](01-general-requirements-and-classification.md#73-software-safety-classification-43)).
Covers Clause 5.6 in full — every sub-clause of 5.6 applies at Class B and
C; there is no integration testing requirement at Class A, since Class A
software is not required to be architecturally decomposed into items in the
first place (see SOP-04).

## 3. Responsibilities

| Role | Responsibility under this SOP |
|---|---|
| Software Development Lead | Plans and documents the integration sequence before integration begins |
| Test Lead | Executes integration tests against each interface's specification; runs regression tests after fixes |
| QA/RA | Confirms integration test records are retained as objective evidence |

## 4. Definitions & Abbreviations

| Term | Meaning |
|---|---|
| Integration testing | Testing that confirms integrated software items behave as described in the architectural design, not merely that they run without crashing |
| Regression testing | Re-testing after a fix to confirm no previously-passing behaviour was broken |

## 5. References

- IEC 62304:2006+AMD1:2015, §5.6
- **SOP-04 — Software Architecture**: the interface specifications
  integration tests are written against
- **SOP-13 — Software Problem Resolution Process**: anomalies found during
  integration testing are managed through this process

## 6. What the standard requires

| Ref | Title | Applies at Class C | What must be produced |
|---|---|---|---|
| 5.6.1 | Integrate software units | Yes | (No standard-named output.) |
| 5.6.2 | Verify software integration | Yes | Records of the evidence that software units were integrated in accordance with the integration plan |
| 5.6.3 | Software integration testing | Yes | Documented results of testing the integrated software items |
| 5.6.4 | Software integration testing content | Yes | (No standard-named output.) |
| 5.6.5 | Evaluate software integration test procedures | Yes | (No standard-named output.) |
| 5.6.6 | Conduct regression tests | Yes | (No standard-named output.) |
| 5.6.7 | Integration test record contents | Yes | Integration test records: the pass/fail result and list of anomalies, sufficient records to repeat the test, and the identity of the tester |
| 5.6.8 | Use software problem resolution process | Yes | (No standard-named output.) |

(Quoted directly from `applicability.json`, identical in content to the
self-referential set's [07](../07-software-integration-and-testing.md),
whose Status is itself marked **Partial** — that project has no formally
partitioned software items to integrate. This device-example set's version
is a template for the same clause, not a completed alternative.)

## 7. Procedure

*Not yet written for SentinelFlow 500 — see the [Device Example Register](README.md)
for what "template" status means. Once complete, this section would give
SentinelFlow 500's actual integration sequence — e.g. Sensor Monitoring
integrated with Motor Control before Alarm Management is layered on top —
and the interface tests run at each step.*

### 5.6.1–5.6.2 — Integrate and verify integration

**[Template.]**

### 5.6.3–5.6.5 — Integration testing, its content, and procedure evaluation

**[Template.]**

### 5.6.6 — Regression testing

**[Template.]**

### 5.6.7–5.6.8 — Test record contents and problem resolution

**[Template — anomalies found here would be logged per SOP-13.]**

## 8. Records

| Record | Produced by | Retained in |
|---|---|---|
| Integration plan | Software Development Lead | Project technical file |
| Integration test records, per step | Test Lead | Project technical file |

## 9. Revision History

*Illustrative only — SentinelFlow 500 has no real revision history.*

| Version | Status | Description |
|---|---|---|
| 1.0 | Template | Structure and requirements table complete; Procedure section pending |
