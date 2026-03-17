# 2026-03-17 WAHA 1:1 identity hotfix

## Summary
Applied a minimal rule to avoid promoting WAHA technical ids to canonical CRM contact identities for direct chats.

## Changes
- `backend/providers/whatsapp/waha/wahaMapper.js` now prefers a stable participant id for 1:1 chats when `payload.from` looks technical.
- Added logging when contact identity is overridden.

## Notes
- Keeps Lite as source of truth and prevents parallel contacts for the same real number.
