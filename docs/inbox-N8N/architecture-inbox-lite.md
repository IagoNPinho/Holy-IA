# Holy AI — Inbox Lite Architecture

## Context

The previous architecture relied on whatsapp-web.js to build a WhatsApp-Web-like inbox.

This approach introduced several problems:

- unstable message hydration
- duplicated messages
- complex provider state
- heavy operational load
- difficult debugging

Because an operational system must be delivered quickly, we are temporarily pivoting.

The new architecture prioritizes **stability and fast delivery**.

The WhatsApp provider will be orchestrated by **n8n**, while the Holy AI backend becomes the **single source of truth**.

---

# Architectural Principles

## 1. Backend is the source of truth

All application state lives in the backend database.

This includes:

- contacts
- conversations
- messages
- AI state
- media references

The frontend never reads data directly from n8n.

---

## 2. n8n is only an orchestrator

n8n handles:

- inbound message events
- media download/upload
- calling backend webhooks
- calling AI services
- sending WhatsApp messages
- reporting message status

n8n does not own any persistent state.

---

## 3. Frontend only communicates with backend

The frontend never calls n8n directly.

All operations go through the backend API.

---

## 4. Media is not stored in SQLite

Media files must be stored in an object storage provider.

Recommended:

Supabase Storage

Workflow:

WhatsApp → n8n → download media → upload to Supabase → store URL in backend

---

## 5. Every message has two IDs

Internal ID → database primary key

External ID → provider message ID

Example:
id: 742
external_message_id: wamid.12345


External message IDs must be unique.

---

# High Level Architecture


WhatsApp
↓
n8n workflows
↓
Backend Holy AI
↓
Database
↓
Frontend Inbox Lite


---

# AI Flow


Inbound message
↓
n8n
↓
POST backend inbound webhook
↓
Backend persists message
↓
Backend determines AI eligibility
↓
n8n calls AI
↓
AI result webhook
↓
Backend persists intent and response
↓
n8n sends message


---

# Important Rule Regarding whatsapp-web.js

The existing whatsapp-web.js implementation **must not be deleted**.

It should only be:

- disabled
- bypassed
- isolated

Future development may restore it as a provider.

This pivot is temporary.