# Task Log: Frontend Inbox Lite Rewire

Date: 2026-03-13

## Objective
Rewire conversations UI to Inbox Lite endpoints while keeping legacy whatsapp-web.js intact.

## Changes
- Updated conversations list and messages fetch to `/api/conversations` and `/api/conversations/:id/messages`.
- Updated manual send and AI toggle endpoints for Inbox Lite.
- Disabled legacy message history pagination (no `before` support in Lite yet).

## Validation
- Not run (requires UI verification).
