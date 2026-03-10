# Backend System Design

## Objective

Define the backend architecture of Holy AI for the current phase:

- 1 clinic
- 1 WhatsApp number
- production-ready on current Hostinger VPS

The design must remain lightweight, maintainable, and ready for future expansion to multiple clinics and numbers.

---

## Current Runtime Context

Current backend stack:

- Node.js
- Express
- SQLite
- whatsapp-web.js
- SSE
- PM2
- Nginx
- OpenAI / Groq
- Hosted on Hostinger VPS

Current system already includes:

- WhatsApp message ingestion
- message persistence
- conversation updates
- AI automation
- SSE events
- follow-up scheduling
- bulk send
- metrics
- WhatsApp status endpoints

---

## Scope

This document covers:

- backend runtime boundaries
- WhatsApp session handling
- message processing pipeline
- persistence model
- SSE event architecture
- outbound queue direction
- AI integration boundaries
- future readiness for clinic_id and instance_id

---

## Out of Scope

This document does not define:

- frontend UI architecture
- Meta API integration
- multi-server distributed scaling
- Redis or external queue infra for current phase
- Postgres migration details

---

## Core Design Principles

1. One WhatsApp number = one runtime session
2. Current phase uses a default clinic and default instance
3. Backend must stay lightweight for VPS hosting
4. API and WhatsApp runtime should be logically separated
5. SSE is used for one-way realtime dashboard updates
6. AI logic must be decoupled from raw WhatsApp runtime as much as possible
7. Data persistence is the source of truth

---

## Main Backend Modules

### 1. HTTP API Layer

Responsibilities:

- auth
- conversations
- messages
- metrics
- follow-ups
- settings
- WhatsApp control/status
- campaign actions
- CRM actions

Main route groups currently observed:

- `/auth`
- `/conversations`
- `/messages`
- `/followups`
- `/settings`
- `/whatsapp`
- `/metrics`
- `/events`
- `/bulk-send`
- `/schedule-send`

---

### 2. WhatsApp Runtime Layer

Responsibilities:

- initialize whatsapp-web.js client
- maintain LocalAuth session
- ingest incoming messages
- emit QR / ready / disconnect events
- handle reconnect logic
- send outbound messages
- call message processing pipeline

Current runtime uses LocalAuth and Puppeteer-based whatsapp-web.js.

---

### 3. Message Processing Pipeline

Inbound flow:

1. WhatsApp client receives message
2. dedupe is applied
3. contact and conversation are ensured
4. message is persisted
5. conversation is updated
6. SSE events are emitted
7. follow-up logic is evaluated
8. AI automation may run
9. AI reply is persisted and emitted

Outbound flow:

1. operator or automation triggers send
2. payload is validated
3. message is sent via WhatsApp runtime
4. outbound message is persisted
5. conversation is updated
6. SSE events are emitted

---

### 4. Recent Sync Strategy

The backend uses a lightweight, DB-first reconciliation model:

- **Bootstrap sync** (on WhatsApp ready): sync 50 recent chats, hydrate 20 chats with ~20 recent messages.
- **Open-thread sync** (first `/messages/:id` page): reconcile latest ~100 messages from WhatsApp into SQLite before serving.
- **Older history**: DB-first pagination with remote backfill only when DB history is exhausted.

This keeps history lightweight while ensuring recent messages are reconciled with WhatsApp Web.

---

### 5. Persistence Layer

Current database: SQLite

Main entities already present in current architecture:

- conversations
- messages
- contacts
- clinic_settings
- ai_logs
- follow_up_jobs
- patient_memory
- procedures
- appointments

Future-facing rule:

All operational entities should eventually support:

- `clinic_id`
- `instance_id`

For now, current implementation may operate with implicit default values.

---

### 6. Realtime Layer (SSE)

Responsibilities:

- maintain active EventSource clients
- emit WhatsApp status updates
- emit message events
- emit conversation updates

Current event types observed:

- `qr`
- `ready`
- `disconnected`
- `message_received`
- `message_sent`
- `conversation_updated`

SSE must remain lightweight and should not become the source of truth.

---

### 6. AI Layer

Responsibilities:

- decide whether AI should answer
- build prompt context
- route provider/model
- persist AI execution logs
- send AI-generated messages back through outbound path

Important architectural rule:

AI must remain a service layer, not the owner of the message pipeline.

The message pipeline owns persistence and state transitions.
AI only contributes decision/output.

---

### 7. Follow-up / Reactivation Layer

Responsibilities:

- schedule follow-up jobs
- cancel pending jobs on new inbound activity
- support reactivation campaigns
- support operator-triggered reminders

Current limitation:

in-memory scheduling and timers are fragile on crashes/restarts and should be improved later.

---

### 8. Campaign / Outbound Layer

Responsibilities:

- controlled list sending
- hourly/daily limits
- campaign state tracking
- safe message queueing
- pause/resume/cancel

Current phase should treat this as a controlled outbound campaign layer, not unrestricted bulk sending.

---

## Logical Runtime Separation

Even on one VPS, backend should be reasoned about as two logical areas:

### App/API area
- Express routes
- auth
- metrics
- CRM
- settings
- SSE endpoint

### Session/runtime area
- WhatsApp client
- send/receive handling
- reconnect behavior
- session health
- low-level message events

This separation reduces future refactor cost even if both still run in one process today.

---

## Future Data Model Direction

### Current phase
- default clinic
- default instance

### Future phase
Introduce:

- `clinic_id`
- `instance_id`

Recommended future structure:

- clinic
- clinic_number / instance
- contact
- conversation
- message
- campaign
- follow_up_job
- ai_execution
- session_event

---

## Operational Constraints

Current infra:

- Hostinger VPS
- 1 vCPU
- 4 GB RAM
- SQLite
- frontend hosted on Vercel

Therefore backend design must:

- avoid heavy background workers
- avoid excessive polling
- avoid unnecessary memory duplication
- avoid expensive full-refresh APIs
- keep WhatsApp runtime stable

---

## Known Risks

- whatsapp-web.js disconnects
- SQLite concurrency limits
- in-memory timers lost on crash
- SSE held in memory
- no full queue system yet
- current architecture is not truly multi-tenant yet

---

## Acceptance Criteria

Backend architecture is considered aligned when:

- 1 clinic / 1 number works reliably
- conversations and messages are persisted consistently
- SSE reflects backend changes correctly
- WhatsApp status is observable
- CRM, reactivation and campaign features can reuse existing message pipeline
- system can evolve later to clinic_id and instance_id without rewrite
