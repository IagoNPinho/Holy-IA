# Feature: CRM MVP

## Objective

Provide a minimal CRM system inside Holy AI that allows clinic operators to manage leads and conversations coming from WhatsApp.

The goal is to turn conversations into structured leads that can be tracked through a pipeline and followed up later.

---

## Scope

The CRM MVP includes:

- lead profile view
- pipeline stages
- tags
- internal notes
- follow-up scheduling
- conversation history
- filtering by status
- filtering by last interaction

Lead fields:

- name
- phone
- tags
- pipeline stage
- notes
- last interaction
- next follow-up
- assigned operator

Pipeline stages example:

- New Lead
- Contacted
- Interested
- Waiting Response
- Appointment Scheduled
- Closed
- Lost

---

## Out of Scope

The following will NOT be implemented in the CRM MVP:

- multiple pipelines per clinic
- complex automation rules
- sales forecasting
- advanced analytics
- integrations with external CRM tools

---

## User Flow

1. Lead sends message via WhatsApp
2. System creates or updates contact
3. Contact appears in conversation inbox
4. Operator opens lead profile
5. Operator can:
   - change pipeline stage
   - add notes
   - add tags
   - schedule follow-up
6. Lead can later be targeted by reactivation or campaigns

---

## Technical Notes

Data is stored using existing entities:

- contacts
- conversations
- messages
- follow_up_jobs

Future improvement will include:

- explicit `lead_stage`
- CRM filters in dashboard
- tag system for segmentation

---

## API / Data Contracts

Potential endpoints:

GET /contacts  
GET /contacts/:id  
PATCH /contacts/:id  
POST /contacts/:id/note  
POST /contacts/:id/tag  

Existing endpoints used:

GET /conversations  
GET /messages/:conversationId  

---

## Risks

- CRM logic becoming tightly coupled with conversations
- missing indexes causing slow queries
- UI complexity if too many features added early

---

## Acceptance Criteria

The CRM MVP is complete when:

- operator can view lead profile
- operator can update pipeline stage
- operator can add notes
- operator can add tags
- operator can schedule follow-up
- lead conversation history is visible