# 03 — Software Requirements Specification (Device Example)

**Clause:** 5.2 — Software Requirements Analysis · **Register:** [Device Example Register](README.md)

**Document ID:** SOP-03 · **Device:** SentinelFlow 500 (fictional) · **Safety class:** C
**Status:** SOP — template (Procedure not yet written for SentinelFlow 500)

> **Fictional worked example.** See [SOP-01](01-general-requirements-and-classification.md)
> for the disclaimer that applies to this whole document set, and the
> [Device Example Register](README.md) for the SentinelFlow 500 device
> description and what "template" status means here.

## 1. Purpose

This SOP defines how SentinelFlow 500's software requirements are derived
from system-level requirements, documented, and kept traceable — the
Software Requirements Specification (SRS) process for Clause 5.2.

## 2. Scope

Applies to all functional, non-functional, interface, and security
requirements for SentinelFlow 500's control software (Class C — see
[SOP-01 §7.3](01-general-requirements-and-classification.md#73-software-safety-classification-43)).
Covers Clause 5.2 in full, including the requirement to include risk control
measures in the requirements set and to re-evaluate the device risk analysis.

## 3. Responsibilities

| Role | Responsibility under this SOP |
|---|---|
| Software Development Lead | Owns the SRS; ensures every requirement is traceable to a system requirement |
| QA/RA | Reviews the SRS for completeness, consistency, correctness and testability before design begins |
| Risk Manager | Confirms risk control measures from SOP-11 are represented in the SRS; re-evaluates the device risk analysis against new/changed requirements |

## 4. Definitions & Abbreviations

| Term | Meaning |
|---|---|
| SRS | Software Requirements Specification |
| Traceability | The recorded link from a software requirement to its source system requirement, and forward to the design and test that satisfy it |
| Risk control measure | A requirement whose purpose is to reduce a risk identified in the risk management file |

## 5. References

- IEC 62304:2006+AMD1:2015, §5.2
- **SOP-01 — General Requirements & Classification**
- **SOP-04 — Software Architecture**: consumes this SRS as its input
- **SOP-11 — Software Risk Management File**: source of the risk control
  measures §5.2.3 requires in the SRS

## 6. What the standard requires

| Ref | Title | Applies at Class C | What must be produced |
|---|---|---|---|
| 5.2.1 | Define and document software requirements from system requirements | Yes | Documented software system requirements, derived from the system level requirements |
| 5.2.2 | Software requirements content | Yes | Software requirements content: functional and capability, inputs and outputs, interfaces, alarms and messages, security, user interface, data and database, installation and acceptance, operation and maintenance, IT-network aspects, and regulatory requirements |
| 5.2.3 | Include risk control measures in software requirements | Yes | Risk control measures implemented in software, included in the requirements |
| 5.2.4 | Re-evaluate medical device risk analysis | Yes | Re-evaluated and updated medical device risk analysis |
| 5.2.5 | Update requirements | Yes | Re-evaluated and updated requirements, including system requirements |
| 5.2.6 | Verify software requirements | Yes | Documented verification that the software requirements implement the system requirements, do not contradict each other, avoid ambiguity, permit test criteria, are uniquely identifiable and are traceable |

(Quoted directly from `applicability.json`, identical in content to the
self-referential set's [03](../03-software-requirements-specification.md).)

## 7. Procedure

*Not yet written for SentinelFlow 500 — see the [Device Example Register](README.md)
for what "template" status means. Once complete, this section would give
SentinelFlow 500's actual requirements — e.g. the occlusion-alarm response
time, the dose-rate validation range, the alarm escalation behaviour — the
device-specific answer to each row of the table in §6.*

### 5.2.1–5.2.2 — Requirements derived from system level, and their required content

**[Template.]**

### 5.2.3 — Risk control measures included in requirements

**[Template — see SOP-11 for the risk control measures this section would incorporate.]**

### 5.2.4–5.2.5 — Re-evaluate and update the medical device risk analysis and requirements

**[Template.]**

### 5.2.6 — Verify software requirements

**[Template.]**

## 8. Records

| Record | Produced by | Retained in |
|---|---|---|
| Software Requirements Specification, current version | Software Development Lead | Project technical file |
| Requirements review record | QA/RA | Project technical file |
| Traceability matrix (system → software requirements) | Software Development Lead | Project technical file |

## 9. Revision History

*Illustrative only — SentinelFlow 500 has no real revision history.*

| Version | Status | Description |
|---|---|---|
| 1.0 | Template | Structure and requirements table complete; Procedure section pending |
