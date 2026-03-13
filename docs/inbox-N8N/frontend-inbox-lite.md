# Frontend — Inbox Lite

The frontend provides an operational conversation panel.

It is not intended to replicate WhatsApp Web.

---

# Layout

Three-column layout.

Left column

Conversation list.

Shows

name  
last message  
timestamp  
unread badge  
intent  
AI enabled indicator

---

Center column

Conversation timeline.

Displays

message bubbles  
media previews  
timestamps

Supports

manual message sending.

---

Right column

Conversation context.

Displays

AI toggle  
intent detected  
confidence  
AI message count  
customer message count  
conversation status

---

# Interaction Rules

Frontend only calls backend APIs.

No direct integration with n8n.

---

# Performance Requirements

Conversation list must load under 500ms.

Message timeline must support pagination.