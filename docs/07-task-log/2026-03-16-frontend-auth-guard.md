# 2026-03-16 frontend auth guard hardening

## Summary
Prevented dashboard initialization (including SSE) until a valid authenticated session is confirmed.

## Changes
- `frontend/src/components/layout/auth-guard.tsx` now verifies token by calling `/api/conversations` before rendering children; redirects to `/login` and clears invalid tokens.
- `EventProvider` moved from root layout to dashboard layout so SSE only starts after auth is confirmed.

## Notes
- No backend changes required.
