# HYRNIX

HYRNIX is an **AI-native People Operations Decision and Automation Platform** — not a plain HRMS.
Where a traditional HRMS stores records, HYRNIX is meant to help an organization *decide and understand*
its people policies: simulate a policy change before publishing it, trace exactly why a given decision
was made, and answer plain-language questions against real backend data instead of a static dashboard.

The full product vision has four flagship capabilities:

1. **Policy Lab** — draft, simulate, and publish versioned HR policies with before/after impact analysis.
2. **PeopleOps Radar** — proactive detection of organizational risk (e.g. orphaned reports, policy drift). *(future phase)*
3. **Process X-Ray** — a structured, replayable trace of every automated people-ops decision.
4. **HYRNIX IQ** — a natural-language assistant that answers questions using the platform's real data and
   services, with a tool layer designed so a real LLM could later be plugged in.

## What's in this build (P0)

This repository implements the **P0 slice only**, fully working end-to-end:

- **Employee database & roles** — `Employee` model with department, manager hierarchy, role
  (admin/hr/manager/employee), hire date. Seed script creates ~49 synthetic employees across 6
  departments with a realistic manager hierarchy (including a few employees with no manager on file,
  to support future PeopleOps Radar work — not acted on in this pass).
- **Leave policies & leave requests** — a versioned `LeavePolicy` model (entitlement days, eligible
  group, accrual rule, carry-forward, effective date, status, created/approved by) and a `LeaveRequest`
  model that records which exact policy version it was evaluated against and why.
- **Policy Lab** — propose a policy change, run a deterministic simulation (before/after entitlement and
  remaining balance per eligible employee, aggregate impact, conflict detection for overlapping effective
  dates on the same group), then move it through `draft → simulated → pending_approval → published` with
  a distinct, explicit approval action. Every simulation run and state transition is recorded.
- **Process X-Ray** — every leave request evaluation produces a structured trace (trigger event, policy
  version used, rules evaluated with pass/fail + detail, inputs, outcome). The UI renders this as a
  plain-language, step-by-step trace — it is the structured record rendered directly, not an LLM
  explaining it.
- **HYRNIX IQ** — a chat-style UI backed by a **deterministic, rule-based** NL matcher (regex + keyword
  entity extraction, no external AI calls). It supports:
  - `"Why was <employee>'s leave request rejected/approved?"` → looks up the real Process X-Ray record.
  - `"What would happen if I increased <policy>'s annual leave from X to Y?"` → re-runs the exact same
    simulation engine Policy Lab uses, with real data.
  - Anything else → an explicit "I can't answer that" fallback listing what IS supported (never a
    fabricated answer).
  Every query is audited (`HyrnixQuery`: question, matched intent, tool used, result).
  The tool layer (`src/lib/iqTools.ts`) is intentionally structured — typed inputs/outputs, and each tool
  flagged `mutating: boolean` — so a real LLM could later be given the same tools via function-calling
  without changing the underlying logic.

See `ROADMAP.md` for what's deliberately **not** built yet.

## Tech stack

- Next.js 16 (App Router) + TypeScript
- Prisma ORM + SQLite for local dev (schema avoids SQLite-only features — e.g. no native `enum`, since
  SQLite doesn't support it; all "enum-like" fields are plain `String` columns with the allowed values
  documented in `prisma/schema.prisma` comments — so it ports cleanly to Postgres)
- Tailwind CSS
- Vitest for unit tests

## Project layout

```
prisma/schema.prisma      Data model (Employee, LeavePolicy, LeaveRequest, SimulationRun,
                           AuditLog, ProcessTrace, HyrnixQuery)
prisma/seed.ts             Synthetic demo data + an initial published policy + sample leave requests
src/lib/
  balance.ts                Entitlement/accrual/balance calculation (pure, unit-tested)
  eligibility.ts             Policy eligibility / group-overlap rules (pure)
  policyVersion.ts           Which published policy version applies to an employee on a date (pure)
  simulation.ts              Policy Lab's deterministic simulation engine (pure)
  decision.ts                Leave request evaluation -> structured decision trace (pure)
  policyService.ts           DB-backed policy lifecycle (create/simulate/submit/publish) + audit log
  leaveService.ts            DB-backed leave request submission + Process X-Ray trace persistence
  iqTools.ts                 HYRNIX IQ's typed "tool" layer (read-only vs mutating separation)
  hyrnixIq.ts                Deterministic NL pattern matching over the tool layer, with query audit
src/app/
  page.tsx                   Overview
  people/                    People directory
  policy-lab/                Policy list + propose/simulate/submit/publish detail page
  process-xray/              Leave request list + submit form + step-by-step decision trace
  hyrnix-iq/                 Chat UI
  administration/            Audit log + HYRNIX IQ query log + "coming soon" placeholders
  api/                       Route handlers backing all of the above (real DB, no mocked data)
```

The "pure" modules in `src/lib` take and return plain objects (no Prisma types), so the core business
logic — balance calculation, simulation impact, policy version selection, trace generation — is unit
tested without touching the database. `src/lib/mappers.ts` converts Prisma rows into those plain types.

## Running it

```bash
npm install
npm run db:migrate     # applies prisma/migrations (creates prisma/dev.db)
npm run db:seed        # loads ~49 employees + an initial published policy + 2 sample leave requests
npm run dev            # starts Next.js (http://localhost:3000, or next available port)
```

Run the test suite:

```bash
npm test               # vitest run — 18 unit tests covering balance/simulation/policyVersion/decision logic
```

To reset the database from scratch:

```bash
npm run db:reset        # prisma migrate reset --force, then re-seeds automatically
```

### "Acting as"

There's no real auth in this demo. The nav bar has an "Acting as" selector (persisted in
`localStorage`) so you can act as different admin/HR users when creating policies, running
simulations, or publishing — this is what satisfies the "approval must be a deliberate action by
someone" requirement (submit-for-approval and publish are two separate, explicit button clicks, and
the demo flow below shows using two different people for them).

## Demo walkthrough (matches the mandatory end-to-end script)

1. `npm run db:seed` — creates employees + "Standard Annual Leave" v1 (18 days/year, published,
   effective 2023-01-01), plus 2 sample leave requests (one approved, one rejected) with full
   Process X-Ray traces.
2. Go to **Policy Lab** → "Propose policy change". Create e.g. `entitlementDays: 24`,
   `eligibleGroup: Engineering`, effective date in the future. Open the new draft, click
   **Run simulation** — see per-employee before/after entitlement & remaining balance, aggregate
   affected-employee count and net day delta, and any conflicts.
3. Click **Submit for approval**, switch "Acting as" to a different admin/HR user, click **Publish**.
4. Go to **Process X-Ray**, submit a new leave request for an Engineering employee dated *after* the
   new policy's effective date — it is evaluated against the new published version (24 days), while
   the seeded leave requests keep referencing whatever version they were originally evaluated under.
5. Open Process X-Ray for both an old and the new leave request — their rule traces reference
   different policy versions and entitlements.
6. Go to **HYRNIX IQ** and ask `"Why was <employee>'s leave request rejected?"` and
   `"What would happen if I increased Standard Annual Leave's annual leave from 18 to 24?"` — both
   answers are computed live from the same services Policy Lab/Process X-Ray use.

This exact flow was exercised against the running dev server (via the API routes) while building this
project, and the 18-test Vitest suite covers the underlying calculation logic directly.

## Known corners cut (P0, by design)

- No real authentication — "Acting as" is a client-side convenience selector, not a login system.
- Leave requests are auto-evaluated on submission (approve/reject is fully deterministic); there's no
  separate manual-approval workflow for leave requests themselves (policies DO have a deliberate,
  multi-step approval flow, which was the explicit requirement).
- HYRNIX IQ's NLU is deliberately narrow (two supported question shapes + fallback) per the spec —
  it is not a general chatbot.
