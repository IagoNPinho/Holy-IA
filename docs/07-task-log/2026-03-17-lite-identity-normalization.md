# 2026-03-17 Lite identity normalization

## Summary
Normalized Inbox Lite external chat id handling to avoid @lid/@c.us split and ensure sync uses the correct Lite conversation id.

## Changes
- Added `normalizeExternalChatId` in `inboxLiteService`.
- `upsertConversation` now looks up by both raw and normalized chat id and updates stored external_chat_id to the normalized form.
- `GET /api/conversations/:id/messages` sync uses normalized chat id when calling provider history.

## Notes
- Keeps Lite tables as the source of truth.
