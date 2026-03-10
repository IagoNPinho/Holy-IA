# Holy AI v2 — Codex Reference Spec

## Objective
This document is the implementation reference for Codex while evolving Holy AI v2 into a stable WhatsApp inbox SaaS with a UX close to WhatsApp Web.

It exists to prevent scattered architectural decisions and to keep implementation aligned with the intended product model.

## Core product goal
Build a WhatsApp inbox that feels close to WhatsApp Web in the following areas:
- conversation header
- message timeline
- composer/send flow
- recent-thread hydration
- live updates
- clean contact identity display

## Architectural references
Use each reference repo for its proper role:

### 1. Evolution API
Use as reference for:
- instance/session lifecycle
- provider/channel abstraction
- event fan-out
- message sending boundaries
- chat/message retrieval boundaries
- Prisma-style persistence ideas

### 2. Chatwoot
Use as reference for:
- inbox product architecture
- conversation list vs conversation detail separation
- unread logic
- realtime UI update patterns
- store/view structure

### 3. whatsapp-web.js docs
Use only as technical library reference for:
- Chat object behavior
- Message behavior
- auth/session caveats
- media behavior
- event names and limitations

Do not use whatsapp-web.js docs as product architecture reference.

---

# Holy AI v2 Target Modules

## Backend modules
1. Instance Module
2. Identity Module
3. Conversation Module
4. Message Module
5. Sync / Backfill Module
6. Send Module
7. Event Module
8. Realtime Module
9. Integration Module

## Frontend areas
1. Sidebar
2. Conversation Header
3. Message Timeline
4. Composer
5. Contact Panel
6. Realtime Store

---

# Core rules

## Rule 1 — Remote provider is the canonical message source; DB is the local cache

The connected WhatsApp provider is the canonical source of truth for remote chat history and message identity.

The local database is the operational cache used for:
- fast inbox rendering
- pagination already hydrated locally
- conversation summaries
- unread/read state
- realtime fan-out
- integrations and internal workflows

Rendering should start from DB for speed, but message/history truth must not be capped by DB availability alone.

If DB history ends, Holy AI must continue to backfill from the provider whenever the provider can still supply older messages.

The system must never assume a conversation is fully exhausted only because local DB history ended.

## Rule 2 — Never leave identity formatting to the frontend
The backend must expose a resolved display identity.
The frontend must not improvise contact names from raw JIDs.

## Rule 3 — Do not mark history exhausted too early
A single empty remote fetch must not permanently mark a conversation as exhausted.
Use retries/checkpoints/tolerance.

## Rule 4 — Do not mix AI into the messaging core
AI, automations, webhooks, CRM sync, and external workflows belong in Integration Module, not in core message/session modules.

## Rule 5 — Separate read flow from send flow
Conversation retrieval and message sending must be different service boundaries.

## Rule 6 — DB exhaustion is not conversation exhaustion

Reaching the oldest local DB row does not mean the conversation history is exhausted.

If the provider session is connected and the chat can still return older messages, Holy AI must keep backfilling remote history and extending the local cache.

A conversation should only be marked backfill-exhausted after repeated provider checks with stable checkpoints and no older progress.

---

# WhatsApp Chat reference model
Based on whatsapp-web.js Chat behavior, Holy AI should treat a chat as a runtime source object that informs our own domain model.

## Relevant Chat properties
These properties are useful as source reference and should be mapped into Holy AI domain models where appropriate:
- `id`
- `name`
- `isGroup`
- `lastMessage`
- `timestamp`
- `unreadCount`
- `archived`
- `pinned`
- `isMuted`
- `muteExpiration`
- `isReadOnly`

## Relevant Chat methods
These are important mainly as provider capabilities, not as direct UI architecture:
- `fetchMessages(searchOptions)`
- `getContact()`
- `sendMessage(content, options)`
- `sendSeen()`
- `syncHistory()`
- `markUnread()`
- `pin()` / `unpin()`
- `archive()` / `unarchive()`
- `mute()` / `unmute()`
- `sendStateTyping()` / `sendStateRecording()` / `clearState()`

## Important interpretation rule
Do not mirror the Chat class 1:1 into the Holy AI API.
Instead, map it into explicit Holy AI modules:
- fetchMessages -> Message / Sync Module
- getContact -> Identity Module
- sendMessage -> Send Module
- syncHistory -> Sync / Backfill Module
- unread / seen -> Conversation Module + read-state handling
- pin/archive/mute -> optional future conversation actions

---

# Holy AI domain model

## Instance
Represents one WhatsApp connection/session.

Suggested fields:
- id
- name
- provider
- status
- sessionStatus
- lastSeenAt
- createdAt
- updatedAt

## Conversation
Represents one inbox thread.

Suggested fields:
- id
- instanceId
- remoteJid
- identityKey
- displayName
- displayPhone
- avatarUrl
- isGroup
- lastMessageId
- lastMessagePreview
- lastMessageAt
- unreadCount
- lastReadAt
- syncStatus
- lastRemoteSyncAt
- createdAt
- updatedAt

## Message
Represents one stored message.

Suggested fields:
- id
- instanceId
- conversationId
- remoteJid
- providerMessageId
- fromMe
- authorJid
- body
- type
- status
- timestamp
- mediaUrl
- quotedMessageId
- rawPayload

## SyncCheckpoint
Represents thread hydration progress.

Suggested fields:
- id
- conversationId
- lastCursor
- lastMessageTimestamp
- emptyFetchCount
- exhaustedAt
- updatedAt

---

# Identity rules

## JID normalization
Centralize all JID handling in Identity Module.
Support at minimum:
- `@c.us`
- `@lid`
- `@g.us`
- null/empty/invalid values

## Identity helpers
Implement and reuse:
- `normalizeJid(input)`
- `getJidType(input)`
- `getIdentityKey(input)`
- `extractPhoneFromJid(input)`
- `formatDisplayPhone(phone)`
- `resolveDisplayIdentity(input)`

## Display identity priority
Use this priority order:
1. `contactName`
2. `pushName`
3. `verifiedName`
4. formatted phone
5. normalized JID fallback

---

# Conversation list behavior
Holy AI conversation list should be conversation-based, not notification-based, for v2.

Each sidebar item should expose:
- conversationId
- instanceId
- remoteJid
- displayName
- displayPhone
- avatarUrl
- lastMessagePreview
- lastMessageAt
- unreadCount
- isGroup
- selected state on client

Ordering:
- most recent activity first

Unread:
- driven by stored conversation state
- reduced when thread is actually opened/read

---

# Thread hydration behavior
When opening a conversation:

1. load immediately from DB for fast first paint
2. reconcile recent history against the provider
3. persist any new or corrected remote messages
4. update conversation summary and active thread
5. if the user paginates older history and DB has no more rows, continue backfill from the provider
6. only mark remote history as exhausted after repeated provider evidence and checkpoint progression, never just because DB ended

Pagination must be hybrid:
- local-first when data already exists in DB
- provider-backfill when local history is insufficient

---

# Sending behavior
Message sending must follow this flow:
1. validate input
2. resolve target conversation/JID
3. create optimistic local message state if appropriate
4. send through provider adapter
5. persist confirmed provider message data
6. emit standardized event
7. update conversation summary

Sending must live in Send Module, not in generic controller glue.

---

# Realtime behavior
Use one internal event contract.

Suggested event types:
- `instance.updated`
- `conversation.updated`
- `conversation.removed`
- `message.created`
- `message.updated`
- `sync.started`
- `sync.completed`
- `sync.failed`
- `send.accepted`
- `send.confirmed`
- `send.failed`

Suggested event payload shape:
- `type`
- `instanceId`
- `conversationId?`
- `messageId?`
- `timestamp`
- `data`

The frontend should consume these events to update sidebar and active thread.

---

# API contracts

## Instance
- `POST /instances`
- `POST /instances/:id/connect`
- `POST /instances/:id/disconnect`
- `GET /instances/:id/status`
- optional `GET /instances`

## Conversations
- `GET /conversations`
- `GET /conversations/:id`
- `POST /conversations/:id/read`

## Messages
- `GET /conversations/:id/messages?before=<cursor>&limit=<n>`
- `POST /conversations/:id/messages`

## Sync
- `POST /conversations/:id/hydrate`
- `POST /conversations/:id/backfill`

## Realtime
- `GET /events/stream`

---

# What Codex should avoid
- Do not implement broad rewrites without preserving module boundaries.
- Do not scatter JID logic across controllers and frontend.
- Do not couple AI to session/chat/message modules.
- Do not mark history exhausted after one empty provider response.
- Do not use raw provider objects as API response shapes.
- Do not mirror whatsapp-web.js classes directly as Holy AI domain entities.

---

# Implementation phases

## Phase 1 — Foundation
- Instance Module
- Identity Module
- provider interface
- base schema/contracts

## Phase 2 — Inbox Core
- Conversation Module
- Message Module
- list/detail endpoints

## Phase 3 — Hydration
- Sync / Backfill Module
- reconciliation rules
- anti-exhaustion behavior

## Phase 4 — Realtime + UI
- SSE/WebSocket
- sidebar/thread/composer integration

## Phase 5 — QA / Hardening
- typing cleanup
- migration cleanup
- event consistency
- regression fixes

---

# whatsapp-web.js docs extraction priority

These docs should be treated as a capability reference library for Holy AI v2. They are not the product architecture source of truth, but they are highly useful to define provider capabilities, data mapping, and sync/send semantics.

## Tier 1 — Critical for Holy AI core
Inspect these first and extract only what is useful for Holy AI domain mapping.

- `Client.html`
  - lifecycle
  - initialization
  - events
  - chat/message/contact retrieval entrypoints
  - send APIs
  - auth/cache/session interactions
- `Chat.html`
  - sidebar summary fields
  - thread-level actions
  - fetch/history behavior
  - unread/timestamp/lastMessage semantics
- `Message.html`
  - message fields
  - media/quoted/reaction/status-related capabilities
  - serialization concerns
- `Contact.html`
  - display identity inputs
  - pushname/contact name/profile details
- `LocalAuth.html`
  - local session persistence behavior
- `RemoteAuth.html`
  - remote session persistence design ideas
- `NoAuth.html`
  - no-persistence lifecycle behavior
- `BaseAuthStrategy.html`
  - auth strategy boundary design
- `MessageMedia.html`
  - media send/download mapping
- `global.html`
  - global types/options used by send/fetch/auth flows
- `structures_Chat.js.html`
  - source-level behavior for chat mapping
- `structures_Message.js.html`
  - source-level behavior for message mapping
- `structures_Contact.js.html`
  - source-level behavior for contact mapping
- `Client.js.html`
  - source-level behavior for client lifecycle and events

## Tier 2 — Important for richer inbox behavior
Inspect after Tier 1.

- `PrivateChat.html`
  - direct-chat specific behavior
- `GroupChat.html`
  - group-specific differences
- `PrivateContact.html`
  - direct-contact specifics
- `BusinessContact.html`
  - business profile signals
- `Reaction.html`
  - reaction support and future mapping
- `Poll.html`
  - future message type support
- `PollVote.html`
  - poll interaction mapping
- `Label.html`
  - future labeling/tagging support
- `Call.html`
  - optional event surface for call logging
- `GroupNotification.html`
  - group system-message behavior
- `Location.html`
  - message subtype support
- `List.html`
  - interactive message subtype support
- `Buttons.html`
  - interactive message subtype support
- `Order.html`
  - commerce subtype support
- `Product.html`
  - commerce subtype support
- `Channel.html`
  - useful only if channel/business abstractions matter later
- `ClientInfo.html`
  - client metadata / self-device info
- `InterfaceController.html`
  - useful only if UI bridge details are needed for lower-level debugging

## Tier 3 — Lower priority / future / usually not core now
Read only if a concrete feature requires them.

- `Broadcast.html`
- `ScheduledEvent.html`
- `Util.html`
- `LocalWebCache.html`
- `RemoteWebCache.html`
- `WebCache.html`
- `LegacySessionAuth.html`
- `util_Constants.js.html`
- `util_Injected.js.html`
- `util_Injected_LegacyStore.js.html`
- `util_Injected_Store.js.html`
- `util_Injected_Utils.js.html`
- `util_InterfaceController.js.html`
- `util_Puppeteer.js.html`
- `util_Util.js.html`
- `webCache_LocalWebCache.js.html`
- `webCache_RemoteWebCache.js.html`
- `webCache_WebCache.js.html`
- commerce/product/payment-related structures not needed immediately

## Extraction rules for Codex
When extracting from whatsapp-web.js docs, Codex should produce only these outputs:

1. **Capability**
   - what the provider can do
2. **Holy AI mapping**
   - which Holy AI module should own it
3. **Data mapping**
   - which fields map into Instance / Conversation / Message / Identity
4. **Implementation note**
   - any caveat, limitation, or non-obvious behavior
5. **Priority**
   - now / later / ignore

## Mandatory mapping examples
- `Client` -> provider lifecycle, event subscription, bootstrap
- `Chat` -> conversation summary + history/sync capabilities
- `Message` -> message domain mapping
- `Contact` -> identity enrichment
- `AuthStrategy` docs -> session persistence boundary
- `MessageMedia` -> media send/download behavior

## What not to do
- Do not mirror every whatsapp-web.js class into Holy AI one-to-one.
- Do not expose raw provider objects as API contracts.
- Do not import obscure low-level Puppeteer/injected-store details into product-layer design unless debugging requires it.

# Codex output expectation
For implementation prompts, Codex should always return:
1. Summary of what was implemented
2. Files changed
3. Important architectural decisions
4. Deferred items for next step
5. Validation performed

