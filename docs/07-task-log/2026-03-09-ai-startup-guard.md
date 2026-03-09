# Task Log: AI Startup/History Guard

Date: 2026-03-09

## Objective
Prevent AI auto-replies from triggering on historical or startup-sync messages after WhatsApp connects.

## Changes
- Added automation guard that only allows AI/followups for new and recent inbound messages.
- Added safe ai_logs insertion: skip when prompt is empty.

## Validation
- Not run (requires runtime verification).

## Notes
- API contracts unchanged.
