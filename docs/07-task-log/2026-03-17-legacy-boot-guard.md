# 2026-03-17 legacy mode hard-disable via provider guard

## Summary
Guarded legacy whatsapp-web.js bootstrap so it only starts when `WHATSAPP_PROVIDER=wwebjs` and `INBOX_LITE_MODE=false`.

## Changes
- `backend/server.js` now computes `legacyWhatsappEnabled` and uses it to gate whatsapp router and client init.

## Notes
- Prevents legacy init when WAHA is the active provider.
