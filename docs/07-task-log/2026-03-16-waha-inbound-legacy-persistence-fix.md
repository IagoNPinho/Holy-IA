# 2026-03-16 WAHA inbound persistence fix for panel

## Summary
Aligned WAHA inbound legacy bridge to persist into Inbox Lite tables (panel source of truth) and emit SSE with Inbox Lite conversation ids, fixing the disappear-on-refresh issue.

## Changes
- `backend/controllers/whatsappInboundBridgeController.js` now uses `inboxLiteService` to upsert contacts/conversations and persist inbound messages.
- SSE `message_received` and `conversation_updated` now use the Inbox Lite conversation id.
- Added skip filters for `status@broadcast`, `@newsletter`, and `@g.us` before persistence.

## Notes
- Legacy persistence via `whatsappService.handleProviderInboundEvent` is no longer used by the inbound legacy bridge.
