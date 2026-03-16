# 2026-03-16 SSE auth query support

## Summary
Hardened SSE auth to accept JWT via query param or Authorization header and added success/failure logs for troubleshooting.

## Changes
- `backend/server.js` now normalizes `req.query.token` (string or array) and accepts `Bearer <token>` in query.
- Added `sse_auth_success` and `sse_auth_failed` logs with source and reason.

## Notes
- Normal API auth behavior unchanged.
