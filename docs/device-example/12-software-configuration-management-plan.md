# 12 — Software Configuration Management Plan (Device Example)

**Clause:** 8 — Software Configuration Management · **Register:** [Device Example Register](README.md)

**Document ID:** SOP-12 · **Device:** SentinelFlow 500 (fictional) · **Safety class:** C
**Status:** SOP — template (Procedure not yet written for SentinelFlow 500)

> **Fictional worked example.** See [SOP-01](01-general-requirements-and-classification.md)
> for the disclaimer that applies to this whole document set, and the
> [Device Example Register](README.md) for the SentinelFlow 500 device
> description and what "template" status means here.

## 1. Purpose

This SOP defines how SentinelFlow 500's software configuration items —
source code, SOUP, tools, and documentation — are identified, controlled,
and tracked through change, per Clause 8.

## 2. Scope

Applies to all configuration items of SentinelFlow 500's control software
(Class C — see [SOP-01 §7.3](01-general-requirements-and-classification.md#73-software-safety-classification-43)).
Covers Clause 8 in full — every sub-clause applies to all three safety
classes.

## 3. Responsibilities

| Role | Responsibility under this SOP |
|---|---|
| Configuration Manager | Owns the identification scheme; maintains configuration status accounting |
| Software Development Lead | Requests changes to controlled items through the approved change process |
| QA/RA | Approves change requests to controlled configuration items |

## 4. Definitions & Abbreviations

| Term | Meaning |
|---|---|
| Configuration item (SCI) | A uniquely identified software item, SOUP component, tool, or document under configuration control |
| Baseline | A defined, frozen set of configuration items at a specific point (e.g. at release), enabling exact reproduction |

## 5. References

- IEC 62304:2006+AMD1:2015, Clause 8
- **SOP-02 — Software Development Plan**: the configuration management
  planning (§5.1.9–5.1.11) this SOP fulfils
- **SOP-09 — Software Release**: the release archive (§5.8.7) built from
  this SOP's baselines

## 6. What the standard requires

| Ref | Title | Applies at Class C | What must be produced |
|---|---|---|---|
| 8.1.1 | Establish means to identify configuration items | Yes | Scheme for the unique identification of configuration items and their versions |
| 8.1.2 | Identify SOUP | Yes | For each SOUP configuration item: its title, manufacturer and unique SOUP designator |
| 8.1.3 | Identify system configuration documentation | Yes | The set of configuration items and their versions comprising the software system configuration, documented |
| 8.2.1 | Approve change requests | Yes | An approved change request for every change to a controlled configuration item |
| 8.2.2 | Implement changes | Yes | (No standard-named output.) |
| 8.2.3 | Verify changes | Yes | (No standard-named output.) |
| 8.2.4 | Provide means for traceability of change | Yes | Records of the relationships and dependencies between change request, relevant problem report, and approval of the change request |
| 8.3 | Configuration status accounting | Yes | Retrievable records of the history of controlled configuration items, including the system configuration |

(Quoted directly from `applicability.json`, identical in content to the
self-referential set's [12](../12-software-configuration-management-plan.md).)

## 7. Procedure

*Not yet written for SentinelFlow 500 — see the [Device Example Register](README.md)
for what "template" status means. Once complete, this section would give
SentinelFlow 500's actual identification scheme, its SOUP register, and its
change-control workflow.*

### 8.1.1–8.1.3 — Identification scheme, SOUP register, system configuration documentation

**[Template.]**

### 8.2.1–8.2.4 — Change approval, implementation, verification, traceability

**[Template.]**

### 8.3 — Configuration status accounting

**[Template.]**

## 8. Records

| Record | Produced by | Retained in |
|---|---|---|
| Configuration item register (incl. SOUP) | Configuration Manager | Configuration management system |
| Change request records | Configuration Manager | Configuration management system |
| Baseline records, per release | Configuration Manager | Configuration management system |

## 9. Revision History

*Illustrative only — SentinelFlow 500 has no real revision history.*

| Version | Status | Description |
|---|---|---|
| 1.0 | Template | Structure and requirements table complete; Procedure section pending |
