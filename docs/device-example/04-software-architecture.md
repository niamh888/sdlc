# 04 — Software Architecture (Device Example)

**Clause:** 5.3 — Software Architectural Design · **Register:** [Device Example Register](README.md)

**Document ID:** SOP-04 · **Device:** SentinelFlow 500 (fictional) · **Safety class:** C
**Status:** SOP — template (Procedure not yet written for SentinelFlow 500)

> **Fictional worked example.** See [SOP-01](01-general-requirements-and-classification.md)
> for the disclaimer that applies to this whole document set, and the
> [Device Example Register](README.md) for the SentinelFlow 500 device
> description and what "template" status means here.

## 1. Purpose

This SOP defines how SentinelFlow 500's software requirements are
transformed into a software architecture: the software items, their
interfaces, the SOUP within the system, and the segregation needed for risk
control.

## 2. Scope

Applies to the architectural design of SentinelFlow 500's control software
(Class C — see [SOP-01 §7.3](01-general-requirements-and-classification.md#73-software-safety-classification-43)).
Covers Clause 5.3 in full — every sub-clause of 5.3 applies at Class B and C,
so nothing in this SOP is specific to Class C except §5.3.5, segregation for
risk control.

## 3. Responsibilities

| Role | Responsibility under this SOP |
|---|---|
| Software Architect | Authors the architecture; identifies software items and their interfaces |
| Software Development Lead | Confirms the architecture allocates every software requirement to a software item |
| QA/RA | Confirms the architectural design review record meets §5.3.6 |
| Risk Manager | Confirms the segregation described in §5.3.5 matches the risk control measures in SOP-11 |

## 4. Definitions & Abbreviations

| Term | Meaning |
|---|---|
| Software item | An identifiable part of a software system, per the architecture |
| SOUP | Software of Unknown Provenance — third-party or pre-existing software components |
| Segregation | Separation between software items intended to prevent one from compromising another's risk control function |

## 5. References

- IEC 62304:2006+AMD1:2015, §5.3
- **SOP-03 — Software Requirements Specification**: the input this
  architecture is built from
- **SOP-05 — Software Detailed Design**: consumes each software item this
  architecture identifies
- **SOP-11 — Software Risk Management File**: source of the risk control
  measures §5.3.5 segregation exists to protect

## 6. What the standard requires

| Ref | Title | Applies at Class C | What must be produced |
|---|---|---|---|
| 5.3.1 | Transform software requirements into an architecture | Yes | Documented architecture describing the software structure and identifying the software items |
| 5.3.2 | Develop an architecture for the interfaces of software items | Yes | Documented architecture for the interfaces between software items and between software items and external components |
| 5.3.3 | Specify functional and performance requirements of SOUP item | Yes | Functional and performance requirements specified for each SOUP item |
| 5.3.4 | Specify system hardware and software required by SOUP item | Yes | System hardware and software specified as necessary to support each SOUP item |
| 5.3.5 | Identify segregation necessary for risk control | Yes | Segregation between software items necessary for risk control, and a statement of how its effectiveness is ensured |
| 5.3.6 | Verify software architecture | Yes | Documented verification that the architecture implements the system and software requirements, supports the interfaces, and supports proper operation of any SOUP |

(Quoted directly from `applicability.json`, identical in content to the
self-referential set's [04](../04-software-architecture.md). Note that
5.3.5 is the only requirement in this table that is Class C-specific in the
standard itself — every other row here applies at Class B too.)

## 7. Procedure

*Not yet written for SentinelFlow 500 — see the [Device Example Register](README.md)
for what "template" status means. Once complete, this section would give
SentinelFlow 500's actual software items — e.g. Motor Control, Sensor
Monitoring, Alarm Management, Display/UI, Dose Validation — their
interfaces, the SOUP they depend on, and the segregation between the
dose-validation item and the rest of the system.*

### 5.3.1–5.3.2 — The architecture and its interfaces

**[Template.]**

### 5.3.3–5.3.4 — SOUP requirements and environment

**[Template.]**

### 5.3.5 — Segregation necessary for risk control

**[Template — see SOP-11 for the risk control measures this section would protect.]**

### 5.3.6 — Verify software architecture

**[Template.]**

## 8. Records

| Record | Produced by | Retained in |
|---|---|---|
| Software architecture document, current version | Software Architect | Project technical file |
| Architectural design review record | QA/RA | Project technical file |
| Traceability matrix (requirements → software items) | Software Architect | Project technical file |

## 9. Revision History

*Illustrative only — SentinelFlow 500 has no real revision history.*

| Version | Status | Description |
|---|---|---|
| 1.0 | Template | Structure and requirements table complete; Procedure section pending |
