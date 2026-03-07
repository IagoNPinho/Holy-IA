# Holy AI System Overview

> Generated: 2026-03-07
> Scope: Repository analysis only. No code changes were made.

## 1) System Architecture

**Purpose**: Holy AI is a WhatsApp automation SaaS for clinics. It receives WhatsApp messages via `whatsapp-web.js`, stores them in SQLite, optionally triggers AI responses (OpenAI with Groq fallback), and streams updates to a Next.js dashboard via Server Sent Events (SSE).

**High-level flow**
```
Patient -> WhatsApp -> whatsapp-web.js (Puppeteer) -> Express API
  -> SQLite (conversations/messages/etc.)
  -> AI (OpenAI primary / Groq fallback)
  -> SSE events -> Next.js dashboard
```

**Key runtime components**
- Backend: Node.js + Express, SQLite, whatsapp-web.js (Puppeteer), OpenAI/Groq
- Frontend: Next.js App Router, Shadcn UI, Tailwind, Zustand, SSE EventSource
- Infra: PM2 + Nginx on Ubuntu VPS (backend), Vercel for frontend

## 2) Backend Architecture

### Entry points and configuration
- **Entry**: `backend/server.js`
- **Env loader**: `backend/config/env.js` (dotenv)
- **Process**: PM2 via `backend/ecosystem.config.js`

### Server initialization
`backend/server.js`:
- Loads environment, runs `migrate()`, initializes WhatsApp client, loads pending follow-ups.
- Configures CORS, JSON body limit, static `/uploads`.
- Registers routes, auth middleware, global error handler.
- Starts HTTP server.
- Runs a memory watchdog interval (logs on high usage).

### WhatsApp client initialization
`backend/services/whatsappService.js`:
- Uses `whatsapp-web.js` with `LocalAuth` and Puppeteer headless args for VPS.
- Emits events on QR/ready/auth/disconnect through SSE.
- Contains message ingestion pipeline, AI flow, media handling, and follow-up scheduling.
- Includes a watchdog that restarts WhatsApp client when disconnected.

### AI integration
`backend/services/aiService.js`:
- Builds system prompt from `clinic_settings` (tone, procedures, hours, confirmation message).
- Detects intent via `intentRouter`.
- Routes provider via `modelRouter`:
  - OpenAI for `price_question`, `procedure_question`, `appointment_request`.
  - Groq for `greeting`, `working_hours`, `general_conversation`.
- Uses OpenAI SDK (chat completions) or Groq HTTP fallback.
- Logs usage into `ai_logs`.

### Database layer
- SQLite in `backend/database/whatsapp.sqlite`.
- Access helpers: `backend/database/db.js` (`run/get/all`).
- Schema managed in `backend/database/migrations.js`.

### Realtime (SSE)
`backend/services/sseService.js`:
- Tracks active SSE clients.
- Sends events via `sendEvent(type, payload)`.
- `/events` endpoint in `backend/server.js` (JWT token via query/header).

### Follow-up system
`backend/services/followUpService.js`:
- Stores follow-up jobs in `follow_up_jobs` table.
- Schedules timers on server boot and on new incoming messages.
- Cancels pending follow-ups if new inbound message arrives.

### Scheduling system
`backend/services/scheduleService.js`:
- Reads clinic hours from `clinic_settings.working_hours`.
- Generates hourly slots and excludes existing `appointments` for a date.
- Used when intent is `appointment_request` or `schedule_request`.

### Message processing pipeline (backend)
1. `client.on("message")` calls `handleIncomingMessage`.
2. Deduplication using message IDs and fallback keys.
3. Ensures conversation/contact exists.
4. Saves inbound message + media metadata.
5. Updates conversation fields (last message, unread).
6. Sends SSE events (`message_received`, `conversation_updated`).
7. Checks AI blocklist and global/per-conversation AI flags.
8. Schedules follow-ups.
9. Builds history (last 10), prompt additions (intent/state/memory/slots).
10. Calls AI provider and splits response if needed.
11. Applies human delay and sends replies.
12. Saves AI messages and updates conversation.
13. Emits SSE events (`message_sent`, `conversation_updated`).

### Rate limiting / spam controls
- **Bulk sending**: limited by `BULK_MAX_RECIPIENTS` and delay `BULK_MIN_DELAY_MS`.
- No global rate limiter in Express (UNKNOWN if handled externally).

### WhatsApp session management
- `LocalAuth` stores session data in `/var/www/.wwebjs_auth` (prod path configured in code).
- QR codes emitted via SSE and `qrcode-terminal`.

### API endpoints (observed)
- `POST /auth/login`
- `GET /health`
- `GET /conversations`
- `GET /messages/:conversationId`
- `POST /messages/send`
- `PATCH /conversations/:id/ai-toggle`
- `PATCH /conversations/:id/resolve`
- `POST /followups/schedule`
- `POST /followups/remind`
- `GET /settings` | `PUT /settings`
- `POST /bulk-send`
- `POST /schedule-send`
- `GET /whatsapp/qr` | `GET /whatsapp/status` | `POST /whatsapp/disconnect` | `POST /whatsapp/sync-chats`
- `GET /metrics`
- `GET /ai/status`
- `GET /debug/conversations`
- `GET /events` (SSE)

## 3) Frontend Architecture

### Frameworks & libs
- Next.js App Router, TypeScript
- Zustand for global state
- Shadcn UI + Tailwind
- Recharts (charts), react-virtuoso (virtualized lists)
- SSE via EventSource

### Routing structure
- `/` redirects to `/login`
- `/login`
- `/dashboard`
- `/dashboard/overview`
- `/dashboard/metrics`
- `/dashboard/settings`
- `/dashboard/whatsapp`

### Core layout
- `src/app/layout.tsx`: Global providers + EventProvider + Toaster + Analytics.
- `src/app/dashboard/layout.tsx`: Sidebar + Topbar + main workspace.

### State management
`src/store/conversation-store.ts`:
- Conversations map + ordered list
- Messages per conversation
- Selected conversation
- Typing state
- Selectors for list and selected messages

### SSE integration
`src/components/layout/event-provider.tsx`:
- Single EventSource connection
- JWT passed via query `?token=...`
- Dispatches custom events to subscribers

`src/hooks/use-events.ts`:
- Subscribes to events via context

`src/hooks/use-whatsapp-connection.ts`:
- Listens to `qr` / `ready` / `disconnected` events

### Inbox UI
- Conversation list: `src/modules/conversations/components/conversation-list.tsx`
  - Search, last message, unread badge, stage badge, follow-up alerts
  - Actions: schedule follow-up, send reminder, resolve
  - Virtualized via `react-virtuoso`
- Chat area: `src/modules/conversations/components/chat-area.tsx`
  - Header, messages, typing, input
  - Media rendering (image/audio/video/doc)
  - AI/Human indicator + timestamps
  - Virtualized via `react-virtuoso`

### API client
`src/services/api.ts`:
- Fetch wrapper with JSON, auth header, `API_BASE` from env

### Performance considerations
- Virtualized lists to reduce DOM load.
- Zustand selectors to limit re-renders.
- SSE central provider to avoid multiple connections.

## 4) Database Schema

### Tables
- **conversations**
  - id, contact_id (unique), name, last_message, updated_at, ai_enabled, unread_count, contact_name, created_at, resolved_at
- **messages**
  - id, conversation_id, from_me, body, timestamp, direction, created_at, message_type, intent, media_type, media_url, mime_type
- **clinic_settings**
  - id (1), ai_enabled, ai_enabled_global, clinic_name, tone, voice_tone, procedures, working_hours, confirmation_message, updated_at
- **ai_blocklist**
  - id, contact_id
- **ai_logs**
  - id, conversation_id, prompt, response, created_at, contact_id, intent, provider, model, tokens
- **contacts**
  - id, phone_number, first_seen_at, last_seen_at
- **follow_up_jobs**
  - id, conversation_id, contact_id, type, message, run_at, status, created_at, sent_at
- **patient_memory**
  - id, contact_id, patient_name, interests, last_procedure_discussed, last_intent, notes, created_at, updated_at
- **procedures**
  - id, name, description, price, duration, category, active, created_at
- **appointments**
  - id, patient_name, contact_id, procedure, appointment_date, appointment_time, professional, status, source, created_at

### Relationships
- `conversations (1) -> (N) messages`
- `contacts.phone_number` aligns to `conversations.contact_id` (not a formal FK)
- `patient_memory.contact_id` aligns to `contacts.phone_number`
- `follow_up_jobs.conversation_id` aligns to `conversations.id`
- `ai_logs.conversation_id` aligns to `conversations.id`

## 5) Realtime System (SSE)

### Backend
- `/events` endpoint establishes SSE with JWT token
- Events emitted: `qr`, `ready`, `disconnected`, `message_received`, `message_sent`, `conversation_updated`

### Frontend
- Single EventSource in `EventProvider`
- `useEvents` hooks subscribe per component
- `useWhatsAppConnection` updates QR/ready UI

### Realtime data flow (diagram)
```
whatsapp-web.js -> handleIncomingMessage
  -> saveMessage / updateConversation
  -> sendEvent("message_received")
  -> sendEvent("conversation_updated")
  -> AI -> sendEvent("message_sent")

frontend EventProvider -> useEvents(...) -> Zustand updates
```

## 6) Full Data Flow (end-to-end)

```
1) Patient sends WhatsApp message
2) whatsapp-web.js receives message (Puppeteer session)
3) backend/services/whatsappService.js:
   - dedupe
   - ensure contact + conversation
   - store message + media
   - update conversation + unread
   - emit SSE events
4) AI pipeline (if enabled):
   - detect intent
   - build prompt (intent/state/memory/slots)
   - call OpenAI or Groq
   - split response + human delay
   - send message via WhatsApp
   - store AI reply
   - emit SSE events
5) Frontend receives SSE event and refreshes:
   - Conversations list
   - Message list
```

## 7) Infrastructure

**Backend (VPS)**
- Ubuntu 22.04
- Node.js 20
- PM2 manages backend process
- Nginx reverse proxy (details not in repo)
- Chromium installed for Puppeteer

**Frontend**
- Next.js deployed on Vercel
- Communicates with backend via HTTPS API + SSE

**CI/CD**
- GitHub Actions: `.github/workflows/deploy.yml`
  - SSH to VPS
  - `git reset --hard origin/main`
  - `npm install`
  - `pm2 start/reload ecosystem.config.js`

## 8) Product Features (current)

**Authentication**
- Email/password JWT login (`/auth/login`)

**WhatsApp connection**
- QR generation (SSE + `/whatsapp/qr`)
- Connection status via SSE and `/whatsapp/status`
- Disconnect endpoint

**Realtime messaging**
- SSE events for messages and conversation updates

**AI automation**
- System prompt from clinic settings
- Intent routing and model selection
- AI responses with context and splitting
- Humanized delay

**Conversations**
- List and search
- Unread counts
- AI toggle per conversation
- Resolve conversation

**Follow-ups**
- Auto follow-up jobs (10min + 24h)
- Manual scheduling and reminders

**Media handling**
- Image/audio/video/doc storage in `/uploads`

**Dashboard & metrics**
- Metrics endpoint and UI pages

**Bulk & scheduled messaging**
- `/bulk-send`
- `/schedule-send` (in-memory timers)

**Appointments & procedures**
- Import scripts from CSV
- Appointment slot suggestion engine

## 9) Architectural Risks & Gaps

**Scalability**
- SQLite single-file DB (limits concurrency)
- In-memory timers (follow-ups, scheduled sends) lost on crash
- In-memory conversation state (not persisted)

**WhatsApp stability**
- whatsapp-web.js can be brittle and subject to disconnects
- Potential risk of WhatsApp bans (not mitigated)

**SSE scaling**
- Single Node process holds SSE connections in memory
- No event backpressure or persistence

**Frontend performance**
- Periodic polling still used in dashboard page
- State refresh uses full conversation list fetch

**Security**
- JWT stored in localStorage (XSS risk)
- No rate-limiting middleware

**Data consistency**
- AI logs table contains overlapping columns (prompt/response + provider/model/tokens)
- `intentService.js` unused/duplicated by `intentRouter.js`

**Internationalization**
- Several strings appear with encoding issues (UTF-8 mismatch)

## 10) UNKNOWNs

- Nginx config specifics
- Domain routing and SSL termination
- Any external logging/monitoring
- Background job queue (none in repo)
- Multi-tenant support (not present)

---

# Appendix: Repository Tree (summary)

```
.
+-- .github/workflows/deploy.yml
+-- backend/
¦   +-- server.js
¦   +-- ecosystem.config.js
¦   +-- config/env.js
¦   +-- controllers/
¦   +-- routes/
¦   +-- services/
¦   +-- database/
¦   ¦   +-- db.js
¦   ¦   +-- migrations.js
¦   ¦   +-- whatsapp.sqlite
¦   +-- scripts/
¦   +-- state/
¦   +-- uploads/
¦   +-- .env
+-- frontend/
¦   +-- src/
¦   ¦   +-- app/
¦   ¦   +-- components/
¦   ¦   +-- hooks/
¦   ¦   +-- modules/
¦   ¦   +-- services/
¦   ¦   +-- store/
¦   ¦   +-- utils/
¦   ¦   +-- types/
¦   +-- styles/
¦   +-- package.json
+-- server_comand.md
```

---

# Prompt for Future Improvements

You are a senior full-stack architect working on Holy AI.

Goal: Improve frontend architecture, UX, performance, and scalability without redesigning the system.

Constraints:
- Keep existing Next.js App Router structure and Zustand store.
- Do not change backend API contracts unless absolutely necessary.
- Preserve SSE workflow and WhatsApp integration logic.

Tasks:
1. Improve frontend inbox performance:
   - Reduce polling and rely on SSE updates.
   - Add optimistic updates for sending messages and toggling AI.
   - Avoid full list refresh when a single conversation changes.

2. Improve UI/UX:
   - Intercom-style inbox refinements (hover actions, compact metadata).
   - Consistent typography and spacing across pages.
   - Fix UTF-8 encoding issues in UI text.

3. Scalability:
   - Introduce local caching for messages (per conversation)
   - Enable pagination for message history
   - Prepare hooks for future multi-tenant support

4. Realtime stability:
   - Add event dedupe on client (message ID)
   - Handle SSE reconnect and missed events with incremental fetch

Deliverables:
- A set of targeted frontend changes with minimal API impact
- Updated components and hooks
- Documented performance reasoning

Use this repo’s existing patterns and file locations.

