# Inbox Lite - Current Phase Status

## Completed Phase
Phase 3 - Frontend Inbox Lite rewiring to new endpoints

## Current Phase
Phase 4.1 - Inbox Lite UI cleanup (remove legacy WhatsApp polling/UI)

## Next Phase
Phase 2 - n8n Send Integration

## Key Validated Findings
- `POST /api/webhooks/whatsapp/inbound` returns 200 OK
- repeated inbound messages for the same `externalChatId` reuse the same `conversationId`

## Current Focus
Disable legacy whatsapp-web.js runtime noise while keeping Inbox Lite stable.

## Current Blocker Fixed
- `POST /api/conversations/:id/messages` failing due to missing db helper import

## Legacy Runtime Isolation
Legacy whatsapp-web.js runtime is now gated behind `INBOX_LITE_MODE=true`.

## Inbox Lite Mode Flag
- `INBOX_LITE_MODE=true` disables whatsapp-web.js startup and returns safe responses for `/whatsapp/status` and `/whatsapp/qr`.
