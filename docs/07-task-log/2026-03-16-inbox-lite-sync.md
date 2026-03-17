# 2026-03-16 inbox-lite provider sync

## Summary
Added provider-backed history sync for Inbox Lite conversations when loading message threads.

## Changes
- Added `fetchRecentMessages` to provider contract and WAHA implementation.
- Added `syncMessagesFromProvider` to `inboxLiteService` with dedupe and metadata update.
- `GET /api/conversations/:id/messages` now triggers sync when local thread is short and provider is available.

## Notes
- Sync is idempotent by external message id, with a timestamp/body fallback dedupe.
- No frontend contract changes required.
