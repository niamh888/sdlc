# 05 — Software Detailed Design (Device Example)

**Clause:** 5.4 — Software Detailed Design · **Register:** [Device Example Register](README.md)

**Document ID:** SOP-05 · **Device:** SentinelFlow 500 (fictional) · **Safety class:** C
**Status:** SOP — template (Procedure not yet written for SentinelFlow 500)

> **Fictional worked example.** See [SOP-01](01-general-requirements-and-classification.md)
> for the disclaimer that applies to this whole document set, and the
> [Device Example Register](README.md) for the SentinelFlow 500 device
> description and what "template" status means here.

## 1. Purpose

This SOP defines how each software item in SentinelFlow 500's architecture
is subdivided into software units and designed in enough detail to
implement correctly, per Clause 5.4.

## 2. Scope

Applies to detailed design of SentinelFlow 500's control software (Class C
— see [SOP-01 §7.3](01-general-requirements-and-classification.md#73-software-safety-classification-43)).
Covers Clause 5.4 in full. Note the split within the clause itself:
subdividing into software units (§5.4.1) applies at Class B and C; the
detailed design content, interface design, and design verification
(§5.4.2–5.4.4) apply at Class C only — which is why this document, unlike
most in this set, has requirements that would not all apply if SentinelFlow
500 were reclassified to Class B.

## 3. Responsibilities

| Role | Responsibility under this SOP |
|---|---|
| Software Architect | Subdivides each software item into software units (§5.4.1) |
| Software Development Lead | Owns the detailed design for each unit and its interfaces |
| QA/RA | Confirms the detailed design review record meets §5.4.4 |

## 4. Definitions & Abbreviations

| Term | Meaning |
|---|---|
| Software unit | A software item that is not subdivided further — the level at which detailed design and unit verification (Clause 5.5) operate |
| Detailed design | Design documented in enough detail that implementation requires only coding decisions, not further design decisions |

## 5. References

- IEC 62304:2006+AMD1:2015, §5.4
- **SOP-04 — Software Architecture**: the software items this SOP subdivides
  into units
- **SOP-06 — Unit Implementation and Verification**: consumes each unit's
  detailed design as its implementation input

## 6. What the standard requires

| Ref | Title | Applies at Class C | What must be produced |
|---|---|---|---|
| 5.4.1 | Subdivide software into software units | Yes | (No standard-named output — see the site's Learn page for why some rows carry no `output` entry.) |
| 5.4.2 | Develop detailed design for each software unit | Yes | Design documented in enough detail to allow correct implementation of each software unit |
| 5.4.3 | Develop detailed design for interfaces | Yes | Design documented for the interfaces of each software unit, in enough detail to implement them correctly |
| 5.4.4 | Verify detailed design | Yes | Documented verification that the detailed design implements the architecture and is free from contradiction with it |

(Quoted directly from `applicability.json`, identical in content to the
self-referential set's [05](../05-software-detailed-design.md), whose
Status is itself marked **Partial** — detailed design is written down for
only one of that project's six scripts. This device-example set's version
is a template for the same clause, not a completed alternative.)

## 7. Procedure

*Not yet written for SentinelFlow 500 — see the [Device Example Register](README.md)
for what "template" status means. Once complete, this section would give
the detailed design for SentinelFlow 500's software units — e.g. the
occlusion-detection algorithm, the dose-rate validation logic, the motor
control state machine — down to the level a developer could implement
without further design decisions.*

### 5.4.1 — Subdivide software into software units

**[Template.]**

### 5.4.2–5.4.3 — Detailed design of units and their interfaces

**[Template.]**

### 5.4.4 — Verify detailed design

**[Template.]**

## 8. Records

| Record | Produced by | Retained in |
|---|---|---|
| Detailed design document per software unit | Software Development Lead | Project technical file |
| Detailed design review record | QA/RA | Project technical file |

## 9. Revision History

*Illustrative only — SentinelFlow 500 has no real revision history.*

| Version | Status | Description |
|---|---|---|
| 1.0 | Template | Structure and requirements table complete; Procedure section pending |
