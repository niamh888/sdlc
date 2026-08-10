# 02 — Software Development Plan (Device Example)

**Clause:** 5.1 — Software Development Planning · **Register:** [Device Example Register](README.md)

**Document ID:** SOP-02 · **Device:** SentinelFlow 500 (fictional) · **Safety class:** C
**Status:** SOP — template (Procedure not yet written for SentinelFlow 500)

> **Fictional worked example.** See [SOP-01](01-general-requirements-and-classification.md)
> for the disclaimer that applies to this whole document set, and the
> [Device Example Register](README.md) for the SentinelFlow 500 device
> description and what "template" status means here.

## 1. Purpose

This SOP defines the Software Development Plan (SDP) for SentinelFlow 500:
the lifecycle model, deliverables, tools, and standards its software
development follows, and how that plan stays consistent with device-level
planning, configuration management, and risk management.

## 2. Scope

Applies to all software development planning for SentinelFlow 500's
control software (Class C — see [SOP-01 §7.3](01-general-requirements-and-classification.md#73-software-safety-classification-43)).
Covers Clause 5.1 in full. Does not itself define the configuration
management scheme or the risk management plan in detail — those are owned
by SOP-12 and SOP-11 respectively and referenced from here.

## 3. Responsibilities

| Role | Responsibility under this SOP |
|---|---|
| Software Development Lead | Authors and maintains the SDP; keeps it updated as scope, schedule, or tools change |
| QA/RA | Reviews and approves the SDP and any material revision to it |
| Configuration Manager | Confirms the SDP's configuration management section is consistent with SOP-12 |
| Risk Manager | Confirms the SDP's risk management planning section is consistent with SOP-11 |

## 4. Definitions & Abbreviations

| Term | Meaning |
|---|---|
| SDP | Software Development Plan |
| SOUP | Software of Unknown Provenance — third-party or pre-existing software components |
| Lifecycle model | The overall structure of development activities this plan commits to (e.g. V-model, incremental) |

## 5. References

- IEC 62304:2006+AMD1:2015, §5.1
- **SOP-01 — General Requirements & Classification**: the QMS and
  classification context this plan operates inside
- **SOP-11 — Software Risk Management File**: the risk management process
  this plan's §5.1.7 planning section commits to
- **SOP-12 — Software Configuration Management Plan**: the configuration
  management approach this plan's §5.1.9–5.1.11 sections commit to

## 6. What the standard requires

| Ref | Title | Applies at Class C | What must be produced |
|---|---|---|---|
| 5.1.1 | Software development plan | Yes | Software development plan |
| 5.1.2 | Keep software development plan updated | Yes | Software development plan, kept updated as development proceeds |
| 5.1.3 | Software development plan reference to system design and development | Yes | System requirements referenced in the plan, and procedures for coordinating software development with system development |
| 5.1.4 | Software development standards, methods and tools planning | Yes | Standards, methods and tools for Class C software items, included or referenced in the plan |
| 5.1.5 | Software integration and integration testing planning | Yes | Plan to integrate the software items (including SOUP) and to test during integration |
| 5.1.6 | Software verification planning | Yes | Verification planning: deliverables requiring verification, the verification tasks, the milestones, and the acceptance criteria |
| 5.1.7 | Software risk management planning | Yes | Plan to conduct the software risk management process, including risks relating to SOUP |
| 5.1.8 | Documentation planning | Yes | Documentation planning: for each document, its title or naming convention, purpose, and the procedures and responsibilities for development, review, approval and modification |
| 5.1.9 | Software configuration management planning | Yes | Software configuration management information: what is controlled, the activities and tasks, the responsible organisations, when items come under control, and when problem resolution is used |
| 5.1.10 | Supporting items to be controlled | Yes | Tools, items and settings used to develop the software, included in the items to be controlled |
| 5.1.11 | Software configuration item control before verification | Yes | Plan to place configuration items under configuration management control before they are verified |
| 5.1.12 | Identification and avoidance of common software defects | Yes | Procedure for identifying categories of defect relevant to the chosen programming technology, and evidence that those defects do not contribute to unacceptable risk |

(Quoted directly from `applicability.json`, identical in content to the
self-referential set's [02](../02-software-development-plan.md) — the
requirements don't change with the device, only the answers do.)

## 7. Procedure

*Not yet written for SentinelFlow 500 — see the [Device Example Register](README.md)
for what "template" status means. Each sub-clause below would, once
completed, describe SentinelFlow 500's actual lifecycle model, its
development standards and tools, its integration and verification
planning, and its documentation plan — the device-specific answer to each
row of the table in §6.*

### 5.1.1–5.1.3 — The plan itself, kept updated, referenced to system development

**[Template.]**

### 5.1.4 — Development standards, methods and tools

**[Template.]**

### 5.1.5 — Integration and integration testing planning

**[Template.]**

### 5.1.6 — Verification planning

**[Template.]**

### 5.1.7 — Risk management planning

**[Template — see SOP-11 for the risk management process this section would commit to.]**

### 5.1.8 — Documentation planning

**[Template.]**

### 5.1.9–5.1.11 — Configuration management planning

**[Template — see SOP-12 for the configuration management approach this section would commit to.]**

### 5.1.12 — Identification and avoidance of common software defects

**[Template.]**

## 8. Records

| Record | Produced by | Retained in |
|---|---|---|
| Software Development Plan, current version | Software Development Lead | Project technical file |
| SDP revision history | Software Development Lead | Project technical file |

## 9. Revision History

*Illustrative only — SentinelFlow 500 has no real revision history.*

| Version | Status | Description |
|---|---|---|
| 1.0 | Template | Structure and requirements table complete; Procedure section pending |
