# Task Log: Inbox Lite Phase 1 Pivot

Date: 2026-03-13

## Objective
Introduce Inbox Lite (n8n-orchestrated) without removing legacy whatsapp-web.js, implementing Phase 1 endpoints and schema.

## Changes
- Added isolated Inbox Lite schema tables (`contacts_lite`, `conversations_lite`, `messages_lite`, `media_assets_lite`, `conversation_ai_state_lite`).
- Added Inbox Lite service + controllers + routes for inbound webhook, conversation list, messages list, manual send, AI toggle, outbound status webhook.
- Wired public webhooks before auth and private endpoints behind existing auth.
- Added instrumentation logs and SSE payloads for immediate frontend updates.

## Validation
- Not run (requires live end-to-end with n8n).

## Notes
- Legacy whatsapp-web.js untouched.
