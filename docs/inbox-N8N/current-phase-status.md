# Inbox Lite - Current Phase Status

## Completed Phase
Phase 3 - Frontend Inbox Lite rewiring to new endpoints

## Current Phase
Phase 1.2 - Inbox Lite stabilization and legacy runtime isolation

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
