# ROADMAP

This file tracks what's intentionally **out of scope** for the current (P0) build, for later phases.

## P1

- **PeopleOps Radar** — proactive detection of organizational risk signals: employees with no manager
  on file (the seed data already includes a few of these so the detector has something to find),
  policy drift, leave balance anomalies, span-of-control outliers, etc.
- **Process X-Ray enhancements** — traces for non-leave decisions, trace comparison/diffing across
  policy versions, exportable audit bundles.
- **Workflow Studio** — a multi-step, configurable workflow builder for people-ops processes beyond
  leave (e.g. onboarding checklists, offboarding, policy exception approvals).
- **Real LLM integration for HYRNIX IQ** — swap the deterministic rule-based matcher for an actual LLM
  using the same tool layer (`src/lib/iqTools.ts`), which was deliberately shaped with typed
  input/output schemas and a `mutating: boolean` flag per tool so it can be handed to a model via
  function-calling with a read-only/mutating trust boundary already in place.

## P2

- **Payroll** — compensation, payruns, statutory deductions.
- **Recruitment** — requisitions, candidate pipeline, offers.
- **Performance management** — reviews, goals, calibration.
- **Onboarding automation** — new-hire task orchestration, provisioning.
- **HR Operations / Analytics** nav sections — currently omitted from the nav entirely; will likely
  land alongside PeopleOps Radar and Workflow Studio.

## Infra / hardening (not phase-specific)

- Real authentication & authorization (today: a client-side "Acting as" selector, no login).
- Postgres migration (schema was written to avoid SQLite-only features specifically to make this easy —
  no native Prisma enums, no SQLite-specific functions).
- Pagination on list endpoints (audit log, HYRNIX IQ query log, leave requests) — currently capped with
  `take` limits, fine for demo data volumes.
