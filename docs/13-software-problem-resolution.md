# 13 — Software Problem Resolution Process

**Status: Documented — this project's other strong piece of evidence.**
**Clause:** 9 — Problem Resolution Process · **Register:** [docs/README.md](README.md)

> **Training example only.** This project is a training site, not a real
> medical device (not SaMD, not SiMD) — see
> [docs/README.md](README.md#what-this-is-and-is-not) for the full explanation.

## What the standard requires (Class C — every sub-clause of Clause 9)

| Ref | Title | Applies at | Output |
|---|---|---|---|
| 9.1 | Prepare problem reports | A, B, C | A problem report per problem detected, with a criticality statement and information aiding resolution |
| 9.2 | Investigate the problem | A, B, C | Documented investigation outcome, and either a change request or a documented rationale for no action |
| 9.3 | Advise relevant parties | A, B, C | — |
| 9.4 | Use change control process | A, B, C | — |
| 9.5 | Maintain records | A, B, C | Records of problem reports and their resolution, including verification, and an updated risk management file |
| 9.6 | Analyse problems for trends | A, B, C | — |
| 9.7 | Verify software problem resolution | A, B, C | Verification the resolution closed the problem, reversed adverse trends, was implemented correctly, and introduced no new problems |
| 9.8 | Test documentation contents | A, B, C | Results, anomalies, software version, hardware/software test configuration, test tools, date, tester |

## This process is implemented in code, not only described

Unlike most documents in this set, Clause 9 has a direct, working
implementation: [`tests/anomaly_log.csv`](../tests/anomaly_log.csv), produced
by `load_anomaly_log()` and `reconcile_anomaly_log()` in
[`tests/test_site.py`](../tests/test_site.py). What follows maps each
sub-clause to what that code actually does — including where it falls short
of the full requirement.

## 9.1 — Problem reports

Every check that fails in a test run becomes a row, keyed by *(test group,
check label)* — see [README.md — Anomaly log](../README.md#anomaly-log) for
the full mechanics. Each row carries an id (`ANOM-####`), the failing detail
captured at the moment of failure, and how many consecutive runs it has
failed (`times_seen`).

**What 9.1 asks for that the row does not currently have: a criticality
statement.** The anomaly log's fields are `id, status, group, test,
first_seen, last_seen, times_seen, closed_on, detail` — there is no severity
or criticality field. Every anomaly is currently treated as equally urgent by
the tooling; a human reading the log supplies the judgement of "how bad is
this" that 9.1 expects the report itself to carry. Recorded as a gap below.

## 9.2 — Investigation

The `detail` field is the investigation's evidence — the actual value the
check received versus what it expected, e.g. `['planning', 'planning']` for
a duplicate-id defect. What is not automated: 9.2's requirement for **either
a change request or a documented rationale for taking no action**. The
current process closes an anomaly only when the underlying check starts
passing again — there is no path for "investigated, judged not a real
problem, closing with rationale but without a code change," which a stricter
reading of 9.2 would want to support (e.g. a flaky check, or a requirement
that turned out to be wrong rather than the software).

## 9.3 — Advising relevant parties

The console summary (`ANOMALY LOG` block printed at the end of every run) is
the notification mechanism, read by whoever ran the suite. There is no
broader distribution — no issue tracker integration, no notification to
anyone beyond the person at the keyboard — appropriate for a solo-maintained
project, a real gap for a team of any size.

## 9.4 — Change control

Handled by [12 — Configuration Management Plan](12-software-configuration-management-plan.md):
a fix is a git commit, reviewed the same way any other change is.

## 9.5 — Records, including an updated risk management file

`tests/anomaly_log.csv` **is** the problem-report-and-resolution record —
committed to the repository, so its history is retrievable the way 8.3 asks
of any configuration item (see [12](12-software-configuration-management-plan.md#83--configuration-status-accounting)).
What 9.5 also asks for — an **updated risk management file** — is not linked
automatically: when an anomaly's root cause touches the safety-class data,
updating [11 — Risk Management File](11-software-risk-management-file.md)'s
traceability table is a manual step a maintainer has to remember to do, not
one the tooling prompts for.

## 9.6 — Trend analysis

`times_seen` is a rudimentary trend signal — an anomaly open for eight
consecutive runs is visibly different from one open for one — but there is
no analysis *across* anomalies (e.g. "three of this month's anomalies were
async-error-handling regressions," which might point at a systemic weakness
rather than three unrelated bugs). This is exactly the kind of pattern 9.6
asks a maintainer to look for, and currently nothing in the tooling surfaces
it; it would have to be read by eye from the CSV.

## 9.7 — Verifying the resolution

This is the strongest-covered sub-clause of the group. Because
`reconcile_anomaly_log()` re-derives status from the **current full test
run** rather than from a person's say-so, closing `ANOM-0001` requires:

- the original check to actually pass again (closes the problem);
- every *other* check in the group that ran to still be evaluated in the
  same pass, so a fix that broke something else shows up as a **new**
  anomaly in the same report rather than passing silently (covers "introduced
  no new problems");
- the anomaly's `(group, test)` key to be exactly the one that was failing
  (covers "implemented in the right software and activities" at the
  granularity this project tracks).

What is *not* covered: "reversed adverse trends" in the 9.6 sense — a
problem can close and reopen indefinitely (verified directly — see
[README.md — Anomaly log](../README.md#anomaly-log)'s worked example of
`ANOM-0001` closing then reopening) without that oscillation itself being
flagged as a trend worth investigating.

## 9.8 — Test documentation contents

Identical evidence to [08 — System Testing §5.7.5](08-software-system-testing.md#575--test-record-contents) —
the same gaps apply here: no software-version stamp, no date stamp beyond
the anomaly log's own `first_seen`/`last_seen` columns.

## Gaps

- **No criticality/severity field** on anomaly records (9.1).
- **No "investigated, no action needed" closure path** distinct from
  "the check passes again" (9.2).
- **No cross-anomaly trend analysis** (9.6) — data exists (`times_seen`,
  dates) but nothing currently aggregates it into a signal.
- **No automatic prompt to update the risk management file** when a closed
  anomaly's cause was safety-class data (9.5).

None of these four are silently missing — this document is where they are
recorded, per the very process it describes.
