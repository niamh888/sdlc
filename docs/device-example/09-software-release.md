# 09 — Software Release (Device Example)

**Clause:** 5.8 — Software Release · **Register:** [Device Example Register](README.md)

**Document ID:** SOP-09 · **Device:** SentinelFlow 500 (fictional) · **Safety class:** C
**Status:** SOP — template (Procedure not yet written for SentinelFlow 500)

> **Fictional worked example.** See [SOP-01](01-general-requirements-and-classification.md)
> for the disclaimer that applies to this whole document set, and the
> [Device Example Register](README.md) for the SentinelFlow 500 device
> description and what "template" status means here.

## 1. Purpose

This SOP defines the release gate SentinelFlow 500's software must pass
before it can ship: verification complete, anomalies evaluated, the version
archived, and reliable delivery assured, per Clause 5.8.

## 2. Scope

Applies to release of SentinelFlow 500's control software (Class C — see
[SOP-01 §7.3](01-general-requirements-and-classification.md#73-software-safety-classification-43)).
Covers Clause 5.8 in full — Amendment 1 moved §5.8.1, 5.8.2, 5.8.7 and
5.8.8 from Class B/C to all classes, so at Class C the whole clause applies.

## 3. Responsibilities

| Role | Responsibility under this SOP |
|---|---|
| Software Development Lead | Confirms all planned development activities are complete before release |
| QA/RA | Authorises release under the QMS; IEC 62304 does not itself say who authorises release — that is an ISO 13485 quality management system matter, not a requirement of this standard |
| Risk Manager | Confirms residual risk from any known anomaly is evaluated as acceptable |
| Configuration Manager | Archives the released software, its configuration items, and its documentation per SOP-12 |

## 4. Definitions & Abbreviations

| Term | Meaning |
|---|---|
| Residual anomaly | A known defect present in the software at release, evaluated and either accepted or scheduled for correction |
| Archive | The retained copy of source, build instructions, tools, and SOUP versions sufficient to reproduce a released build |

## 5. References

- IEC 62304:2006+AMD1:2015, §5.8
- **SOP-11 — Software Risk Management File**: source of the residual-risk
  evaluation §5.8.3 requires
- **SOP-12 — Software Configuration Management Plan**: owns the archive
  §5.8.7 requires

## 6. What the standard requires

| Ref | Title | Applies at Class C | What must be produced |
|---|---|---|---|
| 5.8.1 | Ensure software verification is complete | Yes | (No standard-named output.) |
| 5.8.2 | Document known residual anomalies | Yes | All known residual anomalies, documented |
| 5.8.3 | Evaluate known residual anomalies | Yes | Evaluation confirming that known residual anomalies do not contribute to an unacceptable risk |
| 5.8.4 | Document released versions | Yes | The version of the medical device software being released, documented |
| 5.8.5 | Document how released software was created | Yes | The procedure and environment used to create the released software, documented |
| 5.8.6 | Ensure activities and tasks are complete | Yes | Evidence that all development or maintenance plan activities and tasks are complete, with their associated documentation |
| 5.8.7 | Archive software | Yes | Archive of the medical device software, its configuration items and the documentation, retained for the longer of the software lifetime or the applicable regulatory retention period |
| 5.8.8 | Assure reliable delivery of released software | Yes | Procedures assuring reliable delivery of the released software, addressing replication, media labelling, packaging, protection, storage and delivery |

(Quoted directly from `applicability.json`, identical in content to the
self-referential set's [09](../09-software-release.md), whose Status is
itself marked **Partial** — that project has no formal release-versioning
scheme. This device-example set's version is a template for the same
clause, not a completed alternative.)

## 7. Procedure

*Not yet written for SentinelFlow 500 — see the [Device Example Register](README.md)
for what "template" status means. Once complete, this section would give
SentinelFlow 500's actual release checklist, its versioning scheme, and its
archive contents.*

### 5.8.1–5.8.3 — Verification complete; residual anomalies documented and evaluated

**[Template.]**

### 5.8.4–5.8.6 — Version, build procedure, and activity completeness

**[Template.]**

### 5.8.7–5.8.8 — Archive and reliable delivery

**[Template — see SOP-12 for the archive this section would rely on.]**

## 8. Records

| Record | Produced by | Retained in |
|---|---|---|
| Release checklist / gate review record | Software Development Lead | Project technical file |
| Residual anomaly evaluation | Risk Manager | Risk management file (SOP-11) |
| Software archive | Configuration Manager | Configuration management system (SOP-12) |

## 9. Revision History

*Illustrative only — SentinelFlow 500 has no real revision history.*

| Version | Status | Description |
|---|---|---|
| 1.0 | Template | Structure and requirements table complete; Procedure section pending |
