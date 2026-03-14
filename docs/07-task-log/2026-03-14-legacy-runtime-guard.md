# Task Log: Legacy Runtime Guard

Date: 2026-03-14

## Objective
Prevent whatsapp-web.js runtime startup during Inbox Lite mode.

## Changes
- Added `INBOX_LITE_MODE` checks to whatsapp controller endpoints.
- Adjusted health response to report WhatsApp disabled in Inbox Lite mode.

## Validation
- Not run (requires backend restart with `INBOX_LITE_MODE=true`).
