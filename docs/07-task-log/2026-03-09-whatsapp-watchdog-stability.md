# Task Log: WhatsApp Watchdog Stability

Date: 2026-03-09

## Objective
Stabilize WhatsApp QR/auth lifecycle by making watchdog tolerant of auth transitions and transient Puppeteer errors.

## Changes
- Added explicit lifecycle logs for QR, authenticated, ready, auth_failure, disconnected, change_state.
- Introduced watchdog hold windows during init, QR/auth, and state transitions.
- Treated "Execution context was destroyed" as transient with a cooldown hold.

## Validation
- Not run (requires runtime verification on VPS).

## Notes
- No API contracts changed.
