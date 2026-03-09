# Feature: Metrics Dashboard

## Objective

Provide operational and commercial metrics to help clinics evaluate performance and system health.

---

## Scope

Metrics include:

Operational metrics:

- active conversations
- unread messages
- messages sent
- messages received
- average response time

Commercial metrics:

- new leads
- reactivated leads
- campaign responses
- appointments created

AI metrics:

- AI responses
- AI failures
- average latency
- estimated token usage

---

## Out of Scope

Not included in MVP:

- financial forecasting
- complex analytics
- external BI integrations

---

## User Flow

1. Operator opens dashboard
2. Dashboard loads metrics from API
3. Metrics update via periodic refresh or SSE
4. Operator evaluates performance

---

## Technical Notes

Metrics should be calculated using:

- messages table
- conversations table
- follow_up_jobs
- ai_logs

Queries should be optimized to avoid heavy scans.

---

## API / Data Contracts

GET /metrics

Response example:

{
  messagesSentToday: number,
  messagesReceivedToday: number,
  newLeads: number,
  responseTimeAvg: number
}

---

## Risks

- slow queries
- inaccurate metrics if message status is inconsistent

---

## Acceptance Criteria

Metrics dashboard is complete when:

- dashboard loads metrics successfully
- values update daily
- metrics reflect actual database activity