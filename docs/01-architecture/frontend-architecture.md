# Frontend System Design

## Objective

Define the frontend architecture of Holy AI for the current phase:

- 1 clinic
- 1 WhatsApp number
- frontend hosted on Vercel
- dashboard-first workflow for operators

The frontend must remain fast, predictable, and easy to evolve after backend stabilization.

---

## Current Runtime Context

Current frontend stack:

- Next.js App Router
- TypeScript
- Zustand
- Tailwind
- Shadcn UI
- Recharts
- EventSource (SSE)
- Hosted on Vercel

Current structure already includes:

- login
- dashboard
- overview
- metrics
- settings
- WhatsApp page
- conversation store
- EventProvider
- hooks for SSE/event subscriptions

---

## Scope

This document covers:

- page architecture
- state architecture
- SSE integration
- inbox architecture
- CRM UI direction
- metrics UI direction
- future readiness for multi-clinic expansion

---

## Out of Scope

This document does not define:

- backend database design
- Meta API integration
- visual redesign of the whole product
- multi-tenant frontend UI for current phase

---

## Core Design Principles

1. Frontend must reflect backend truth, not invent hidden state
2. SSE should drive incremental updates
3. Full list refreshes should be minimized
4. Conversation UX must be fast and stable
5. Error, loading, and empty states are mandatory
6. Current phase supports one clinic and one number, but frontend should avoid hard assumptions that this will never change
7. Frontend should stay lightweight for Vercel deployment

---

## Main Frontend Areas

### 1. App Shell

Responsibilities:

- auth bootstrap
- global providers
- EventProvider
- dashboard layout
- sidebar / topbar
- route protection

Main routes currently observed:

- `/login`
- `/dashboard`
- `/dashboard/overview`
- `/dashboard/metrics`
- `/dashboard/settings`
- `/dashboard/whatsapp`

---

### 2. Conversation Inbox

Responsibilities:

- list conversations
- select conversation
- render message thread
- reflect unread state
- reflect last message state
- support operator send flow

This is the most critical frontend area and must be stabilized before adding more features.

---

### 3. Conversation State Layer

Current architecture already uses Zustand for:

- conversations map
- ordered list
- messages by conversation
- selected conversation
- typing state

Design rule:

Zustand should remain the single client-side source of UI state for inbox-related data.

---

### 4. Realtime Layer (SSE)

Responsibilities:

- keep one EventSource connection
- receive WhatsApp and conversation events
- update store incrementally
- handle reconnect safely

Frontend must prefer:

- event-based updates
- local store patching
- targeted fetches when necessary

Frontend should avoid:

- frequent full refresh
- reloading the whole conversation list for one event
- duplicate message insertion

---

### 5. Metrics Dashboard

Responsibilities:

- display operational metrics
- display commercial metrics
- display AI metrics

Metrics UI should be read-only and rely on backend-calculated data.

---

### 6. CRM UI

Responsibilities:

- lead profile
- stage update
- tags
- notes
- follow-up scheduling
- conversation context

CRM must be layered on top of existing conversations/contact data instead of becoming a separate disconnected system.

---

### 7. Campaign / Reactivation UI

Responsibilities:

- campaign creation
- recipient selection
- queue status
- campaign metrics
- reactivation filters

This should be designed as operator-assisted workflow, not blind automation.

---

## Recommended Frontend State Strategy

### Server truth
Comes from backend APIs and SSE.

### Client state
Used for:

- selected conversation
- temporary optimistic send state
- UI filters
- modal state
- local pagination / local cache

### Important rule
Do not duplicate backend business logic in the frontend.

---

## Inbox Performance Strategy

Current architecture already has virtualized lists and SSE centralization.

However, frontend review must target these issues:

- reduce polling
- avoid full list refresh on every event
- patch conversation state incrementally
- add message dedupe by message ID
- improve reconnect recovery

Recommended behavior:

- new message event → patch conversation + append message if open
- conversation updated event → patch single conversation item
- reconnect event → perform targeted sync, not full reset by default

---

## Frontend Review Priorities

Before implementing new features, review must focus on:

### 1. Inbox correctness
- conversation list order
- selected conversation state
- message ordering
- unread count consistency
- send flow consistency

### 2. SSE behavior
- duplicate events
- reconnect handling
- missed event recovery
- token/auth handling

### 3. UX consistency
- loading states
- empty states
- error states
- status badges
- UTF-8 / text rendering issues

### 4. Performance
- avoid unnecessary re-renders
- avoid full-fetch loops
- patch store surgically

---

## Future Readiness

Although current phase is one clinic / one number, frontend should be designed so future support can add:

- clinic selector
- instance/number selector
- clinic-scoped dashboard filtering

No need to expose this now in UI, but components and store naming should avoid dead-end assumptions like “single-global-whatsapp-forever”.

---

## Risks

- store becoming inconsistent with SSE events
- duplicated fetch + event logic
- full list refresh hurting performance
- message thread bugs creating operator distrust
- frontend assuming backend data shape incorrectly

---

## Acceptance Criteria

Frontend architecture is considered aligned when:

- inbox works reliably for 1 clinic / 1 number
- SSE updates do not require constant full refresh
- conversation and thread state stay consistent
- WhatsApp status is visible and accurate
- CRM and metrics can be layered on current dashboard structure
- frontend is ready for a review-and-fix pass before new feature implementation