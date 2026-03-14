# Task Log: Inbox Lite Runtime Isolation

Date: 2026-03-14

## Objective
Stabilize Inbox Lite mode and isolate legacy whatsapp-web.js runtime noise.

## Changes
- Added `INBOX_LITE_MODE` flag to disable legacy WhatsApp runtime startup and routes.
- Left legacy code intact for future re-enable.

## Validation
- Not run (requires runtime start with `INBOX_LITE_MODE=true`).
