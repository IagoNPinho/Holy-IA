# Feature: Outbound Campaigns

## Objective

Allow clinics to send controlled campaigns to their contact list for promotions, reminders or announcements.

---

## Scope

Outbound campaign system includes:

- campaign creation
- message template
- contact selection
- sending queue
- rate limits
- campaign status tracking
- campaign metrics

Campaign statuses:

- draft
- approved
- running
- paused
- finished

---

## Out of Scope

Not included in MVP:

- advanced marketing automation
- multichannel campaigns
- external CRM integrations
- A/B testing

---

## User Flow

1. Operator creates campaign
2. Operator writes message template
3. Operator selects recipients
4. Operator reviews campaign
5. Campaign is approved
6. Messages are queued and sent gradually
7. Responses appear in conversations

---

## Technical Notes

Outbound campaigns must use a queue to avoid sending too many messages at once.

Each campaign must track:

- total recipients
- sent messages
- failed messages
- replies

Campaign messages reuse existing message send logic.

---

## API / Data Contracts

Possible endpoints:

POST /campaigns  
GET /campaigns  
POST /campaigns/:id/start  
POST /campaigns/:id/pause  

Existing endpoints used:

POST /bulk-send

---

## Risks

- large campaigns overwhelming the WhatsApp session
- missing rate control
- duplicate messages

---

## Acceptance Criteria

Campaign system is complete when:

- operator can create campaign
- operator can approve campaign
- campaign sends messages through queue
- campaign progress can be monitored