# Feature: Reactivation System

## Objective

Allow clinics to re-engage leads that stopped responding after a period of inactivity.

This system should help recover lost leads and generate additional appointments.

---

## Scope

The reactivation system includes:

- filtering leads by inactivity
- manual reactivation campaigns
- scheduled reactivation
- tracking reactivation responses

Typical triggers:

- no reply after 3 days
- no reply after 7 days
- no reply after 15 days
- tagged as "interested"
- tagged as "awaiting response"

---

## Out of Scope

Not included in the MVP:

- complex AI decision making
- predictive reactivation
- multi-step automation flows
- cross-channel reactivation

---

## User Flow

1. Operator opens CRM
2. Operator filters leads by inactivity
3. Operator selects leads
4. Operator chooses reactivation message
5. System schedules sending through queue
6. Messages are sent gradually
7. Replies are tracked

---

## Technical Notes

Reactivation uses the same message pipeline as normal outbound messages.

The system should reuse:

- message send endpoint
- campaign queue
- conversation tracking

Follow-up jobs table may also be used.

---

## API / Data Contracts

Potential endpoints:

GET /reactivation/leads  
POST /reactivation/run  

Existing endpoints used:

POST /messages/send

---

## Risks

- sending messages too aggressively
- poor segmentation causing low response rates
- overlapping campaigns

---

## Acceptance Criteria

Feature is complete when:

- operator can filter inactive leads
- operator can send reactivation messages
- messages are queued safely
- replies update conversations normally