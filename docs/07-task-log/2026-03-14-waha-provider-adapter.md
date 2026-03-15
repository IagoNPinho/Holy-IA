# Task Log: WAHA Provider Adapter (Priority A)

Date: 2026-03-14

## Objective
Introduce a provider abstraction and wire WAHA into Inbox Lite inbound and outbound flows.

## Changes
- Added provider base types, registry, and WAHA adapter.
- Routed inbound webhook through provider parser before Inbox Lite persistence.
- Added outbound send through provider after persistence.
- Stored provider message id when available.

## Validation
- Not run (requires WAHA endpoint configured).
