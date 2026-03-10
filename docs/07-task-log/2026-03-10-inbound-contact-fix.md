# Task Log: Inbound Contact and Realtime Fix

Date: 2026-03-10

## Objective
Fix inbound message processing crash, correct contact identification, and normalize timestamps for realtime UI updates.

## Changes
- Fixed inbound contactId derivation and ensured contact name comes from `msg.getContact()`.
- Updated outbound contact naming to use chat name (avoid system number name).
- Normalized timestamp parsing in frontend for SQLite UTC strings.

## Validation
- Not run (requires runtime verification).

## Notes
- API contracts unchanged.
