# Backend API Specification — Inbox Lite

The backend API is responsible for:

- message persistence
- conversation state
- AI state
- message sending orchestration

---

# Webhook Endpoints

These endpoints are called by n8n.

---

## Inbound Message

POST /api/webhooks/whatsapp/inbound

Payload example

{
 "instanceId": "clinic",
 "externalChatId": "5585999999999",
 "externalMessageId": "wamid.123",
 "contact": {
   "name": "Maria",
   "phone": "5585999999999"
 },
 "message": {
   "type": "text",
   "text": "Quero agendar consulta"
 },
 "timestamp": "2026-03-12T10:30:00Z"
}

Responsibilities

- normalize phone
- upsert contact
- upsert conversation
- persist message
- update conversation preview
- increment unread counter

Return

{
 "ok": true,
 "conversationId": 12,
 "aiEnabled": true,
 "shouldRunAi": true
}

---

## AI Result

POST /api/webhooks/ai/result

Payload

{
 "conversationId": 12,
 "intent": "schedule_request",
 "confidence": 0.91,
 "reply": "Claro! Vou verificar os horários disponíveis."
}

Responsibilities

- store intent
- update AI state
- create outbound message if needed

---

## Outbound Status

POST /api/webhooks/whatsapp/outbound-status

Updates message status.

---

# Frontend Endpoints

---

## List Conversations

GET /api/conversations

Returns conversation list.

---

## Open Conversation

GET /api/conversations/:id

Returns conversation metadata.

---

## List Messages

GET /api/conversations/:id/messages

Returns ordered message timeline.

---

## Send Message

POST /api/conversations/:id/messages

Creates outbound message and triggers n8n send workflow.

---

## Toggle AI

POST /api/conversations/:id/ai-toggle

Enables or disables AI replies.