# n8n Workflows Specification

This document defines workflows required for Inbox Lite.

---

# Workflow 1 — inbound-message

Trigger

WhatsApp provider webhook

Steps

1 normalize payload

2 download media if present

3 upload media to Supabase

4 call backend inbound webhook

POST /api/webhooks/whatsapp/inbound

5 check response.shouldRunAi

6 if true → trigger AI workflow

---

# Workflow 2 — ai-reply

Steps

1 fetch conversation context from backend

2 call AI model

3 send result to backend

POST /api/webhooks/ai/result

4 backend may request sending message

5 send WhatsApp message

6 notify backend outbound status

---

# Workflow 3 — manual-send

Triggered by backend webhook.

Steps

1 receive send instruction

2 send message via WhatsApp provider

3 report status to backend

---

# Workflow 4 — error-handler

Captures workflow failures.

Responsibilities

- log error
- notify backend
- retry if necessary