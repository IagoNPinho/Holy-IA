# Implementation Order — Inbox Lite

This document defines the correct development sequence.

---

# Phase 1 — Database

Create tables

contacts  
conversations  
messages  
media_assets  
conversation_ai_state

---

# Phase 2 — Backend Core

Implement

inbound webhook  
conversation list endpoint  
message timeline endpoint

---

# Phase 3 — Message Sending

Implement

send message endpoint  
outbound status webhook

---

# Phase 4 — Frontend Inbox

Implement

conversation list  
thread view  
message send input

---

# Phase 5 — AI Integration

Implement

AI webhook  
intent persistence  
AI toggle

---

# Phase 6 — n8n Workflows

Implement

inbound workflow  
AI workflow  
manual send workflow

---

# Final Phase — Testing

Test flows

receive message  
store message  
display message  
AI response  
manual response