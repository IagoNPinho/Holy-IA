# Event Flow and SSE

## Event Sources
WhatsApp runtime emits: `qr`, `ready`, `disconnected`, `message_received`, `message_sent`, `conversation_updated`.

## Backend Emission
`GET /events` opens an SSE stream. On connect, the backend emits:
- `ready` when status is `ready` or `authenticated`
- `disconnected` for any other status
- `qr` if a latest QR is available

Then it forwards runtime and message events as they occur.

## Frontend Consumption
The dashboard listens to the event types above to update connection state and inbox state.

## Failure / Reconnect Strategy
Frontend should reconnect SSE and will receive the current status on connect.
