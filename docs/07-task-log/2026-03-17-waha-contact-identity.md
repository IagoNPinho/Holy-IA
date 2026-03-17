# 2026-03-17 WAHA contact identity normalization

## Summary
Fixed WAHA inbound mapping to avoid using @lid/participant IDs as canonical phone identity for 1:1 chats.

## Changes
- `backend/providers/whatsapp/waha/wahaMapper.js` now normalizes `externalChatId` and contact phone by replacing `@lid` with `@c.us`.
- For 1:1 chats, contact phone is derived from `payload.from` (not `payload.participant`).
- Group chats still prefer `payload.participant` but are logged and skipped downstream.

## Notes
- Keeps Inbox Lite as source of truth with stable contact identity.
