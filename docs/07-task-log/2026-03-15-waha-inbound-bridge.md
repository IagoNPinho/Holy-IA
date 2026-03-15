# 2026-03-15 WAHA inbound legacy bridge

## Summary
Added a WAHA/provider inbound compatibility bridge that persists inbound webhook messages into the legacy `conversations` + `messages` tables and emits the same SSE events used by the current panel.

## Changes
- Added `handleProviderInboundEvent` in `backend/services/whatsappService.js` to persist inbound provider payloads and emit `message_received` + `conversation_updated`.
- Added `backend/controllers/whatsappInboundBridgeController.js` with a public webhook handler at `/api/webhooks/whatsapp/inbound-legacy`.
- Wired the new route in `backend/routes/inboxLite.js`.

## Notes
- Legacy whatsapp-web.js inbound handlers remain intact and can be disabled later.
- AI auto-replies are still tied to whatsapp-web.js inbound flow and are not triggered by this bridge.
