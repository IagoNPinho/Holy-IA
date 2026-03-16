# 2026-03-16 WAHA inbound mapper alignment

## Summary
Aligned WAHA inbound mapper to production payload shape and added parse/skip logs for broadcast/group events.

## Changes
- `backend/providers/whatsapp/waha/wahaMapper.js` now maps from `body.payload` fields:
  - `externalChatId` ? `payload.from`
  - `externalMessageId` ? `payload.id`
  - `message.text` ? `payload.body`
  - `timestamp` ? `payload.timestamp`
  - `contact.phone` ? `payload.participant` or `payload.from`
- Added logs for broadcast/group skips and parse failures with top-level and payload keys.

## Notes
- Group and broadcast skips are enforced downstream in legacy persistence.
