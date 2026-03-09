# Holy AI — 30 Day Roadmap

## Phase Objective

Stabilize Holy AI as a production-ready system for **1 clinic / 1 WhatsApp number** while preparing the architecture for future expansion.

---

# Week 1.1 — Make the system actually work

Goal:

Operate the system reliably for **1 clinic / 1 number**.

## Tasks

### Frontend fixes
- fix conversation list
- fix message rendering
- fix loading states
- fix SSE updates
- fix WhatsApp status UI

### Backend fixes
- validate message persistence
- fix conversations endpoint
- fix message send endpoint
- fix SSE event flow
- validate WhatsApp connection status
- ensure inbound and outbound messages are saved correctly

### Operational validation
- verify PM2 processes
- verify Nginx proxy
- verify CORS with Vercel
- verify SSE stability

---

# Week 1.1 Features

## CRM MVP

Allow clinic operators to manage leads.

Features:

- lead profile
- tags
- notes
- pipeline stage
- last message
- follow-up scheduling

Pipeline example:

- New lead
- Contacted
- Interested
- Waiting response
- Appointment scheduled
- Closed
- Lost

---

## Reactivation System

Re-engage leads that stopped responding.

Rules:

- no reply after X days
- lead tagged for reactivation
- last interaction analysis

Features:

- manual reactivation
- scheduled reactivation
- segmentation filters
- performance tracking

---

## Outbound Campaigns

Allow clinics to send controlled campaigns to their contact base.

Features:

- campaign creation
- message template
- recipient selection
- send queue
- hourly/daily limits
- pause/resume
- campaign metrics

---

## Metrics

Improve dashboard metrics.

Operational metrics:

- new conversations
- unread messages
- messages sent
- messages received
- response time

Commercial metrics:

- new leads
- reactivated leads
- campaign responses
- appointments created

AI metrics:

- AI responses
- AI failures
- latency
- estimated cost

---

# Week 1.2 — Foundation

Goal:

Stabilize the architecture.

Tasks:

- finalize documentation
- introduce clinic_id concept
- introduce instance_id concept
- review backend modules
- review message pipeline

---

# Week 2 — Backend Structure

Prepare system for future scale.

Tasks:

- session manager
- message queue
- better follow-up scheduling
- structured logs

---

# Week 3 — UX and Dashboard

Improve usability.

Tasks:

- inbox improvements
- CRM interface improvements
- filters and search
- better message thread UI

---

# Week 4 — Production Hardening

Prepare for multiple clinics.

Tasks:

- backup routines
- resource monitoring
- VPS limits evaluation
- scale plan to KVM2/KVM4