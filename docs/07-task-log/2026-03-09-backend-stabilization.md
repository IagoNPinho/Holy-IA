# Task Log: Backend Stabilization (1 Clinic / 1 Number)

Date: 2026-03-09

## Objective
Stabilize conversations, messages, follow-ups, SSE events, and WhatsApp status for the single-clinic MVP.

## Changes
- Follow-ups now schedule on every inbound message, independent of AI enable/blocklist.
- Media-only inbound messages persist with a placeholder body.
- SSE emits current WhatsApp status and latest QR on connect.
- Reading messages emits `conversation_updated` after unread reset.

## Validation
- Not run (code changes only).

## Notes
- No API contracts changed.
