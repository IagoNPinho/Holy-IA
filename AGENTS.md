# Holy AI - Agent Operating System

## Project Context

Holy AI is a multi-tenant WhatsApp automation SaaS focused initially on clinics.
The system includes:
- backend API
- WhatsApp session management
- conversation and message persistence
- AI-assisted reply workflows
- SSE or realtime dashboard updates
- frontend dashboard for operators/admins
- deployment and operational safety concerns

The primary goal is to evolve the product with discipline, low waste, and high traceability.

---

## Core Operating Principles

1. The repository is the source of truth.
2. Important decisions must not live only in chat history.
3. Any relevant architectural, workflow, or feature decision must be documented.
4. Prefer small, reversible changes over large speculative rewrites.
5. Follow existing code patterns before inventing new abstractions.
6. Do not perform hidden refactors outside the requested scope unless clearly justified.
7. When changing behavior, always assess impacts on:
   - multi-tenant isolation
   - WhatsApp session safety
   - API contracts
   - frontend compatibility
   - observability
   - deployment/runtime stability

---

## Required Task Flow

For every non-trivial task, follow this order:

1. Understand the request
2. Identify likely affected files
3. Produce a short implementation plan
4. Implement with minimal necessary scope
5. Validate with available checks
6. Update documentation if needed
7. Return a final structured summary

---

## Required Final Response Format

Every substantial task should end with:

- Objective
- Files changed
- What was implemented
- Validation performed
- Documentation updated
- Risks or follow-up notes

---

## Documentation Policy

If a task changes architecture, behavior, contracts, workflows, or important conventions, update docs in the same task.

Use these directories:

- `docs/00-project/` → vision, roadmap, stack, non-negotiables
- `docs/01-architecture/` → technical architecture and system flows
- `docs/02-decisions/` → ADRs and important decisions
- `docs/03-workflows/` → execution workflows
- `docs/04-prompts/` → reusable prompt patterns
- `docs/05-features/` → feature specs
- `docs/06-operations/` → deploy, monitoring, incidents, backups
- `docs/07-task-log/` → per-task execution log

If no suitable document exists, create one.

---

## ADR Rules

Create or update an ADR when any of these happens:

- new architecture pattern
- new integration strategy
- new multi-tenant rule
- new WhatsApp session policy
- new deployment policy
- important tradeoff with long-term effect

ADR files must live in `docs/02-decisions/`.

---

## Backend Rules

When working on backend:

- follow existing route/controller/service/repository patterns
- preserve auth and permission behavior unless explicitly changing it
- validate inputs
- avoid breaking API contracts silently
- keep tenant boundaries explicit
- be careful with concurrency and async flows
- document new endpoints or changed contracts
- preserve operational visibility where possible

---

## Frontend Rules

When working on frontend:

- follow existing component and route conventions
- preserve design consistency
- handle loading, empty, and error states
- do not tightly couple UI to unstable backend assumptions
- document new screens, flows, or contract expectations when relevant

---

## WhatsApp Session Safety Rules

Any change touching sessions, auth folders, worker behavior, retries, queues, or event processing must be treated as sensitive.

Always consider:
- tenant isolation
- session persistence
- reconnection behavior
- rate limiting / throttling
- failure handling
- resource usage

Document meaningful changes to these areas in architecture docs.

---

## Cost and Token Discipline

- prefer focused prompts with clear scope
- avoid analyzing the whole repository without need
- avoid repeating already known context
- one task should target one primary outcome
- use existing docs and patterns to reduce re-analysis cost

---

## Definition of Done

A task is considered done only when applicable items are complete:

- code implemented
- validations performed
- docs updated
- summary returned