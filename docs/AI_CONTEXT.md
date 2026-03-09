# AI Context — Holy AI SaaS

## System Overview

Holy AI is a SaaS platform that automates WhatsApp communication for clinics and businesses using AI.

The system receives WhatsApp messages, stores conversations, optionally generates AI responses, and streams updates to a web dashboard.

Primary goals:

* automate customer conversations
* allow human takeover when necessary
* manage conversations in real time
* provide AI-assisted replies

---

# Tech Stack

Backend:

* Node.js
* Express
* whatsapp-web.js
* SQLite
* OpenAI API

Frontend:

* Next.js
* React
* Server Sent Events (SSE)

Infrastructure:

* VPS deployment
* PM2 process manager
* Nginx reverse proxy

---

# High-Level Architecture

WhatsApp Client
↓
Message Listener
↓
Conversation Manager
↓
AI Response Engine
↓
Message Sender
↓
Frontend Dashboard (SSE)

---

# Core Modules

## WhatsApp Service

Responsible for:

* connecting to WhatsApp via whatsapp-web.js
* receiving messages
* sending replies
* managing sessions

Typical location:

backend/services/whatsappService.js

---

## Conversation Service

Responsible for:

* storing conversations
* managing message history
* retrieving context for AI responses

---

## AI Service

Responsible for:

* sending prompts to OpenAI
* generating AI responses
* applying conversation context
* handling token limits and retries

---

## API Layer

Handles:

* REST endpoints
* dashboard communication
* conversation management

Typical structure:

backend/routes/

---

## Frontend Dashboard

Next.js application that:

* displays conversations
* streams updates via SSE
* allows human operators to respond
* shows AI responses

---

# Message Flow

Incoming message flow:

WhatsApp Message
→ whatsappService
→ conversationService
→ aiService (optional)
→ send response
→ broadcast update via SSE

---

# Code Organization Rules

Backend structure:

backend/config
backend/controllers
backend/data
backend/database
backend/middleware
backend/routes
backend/scripts
backend/services
backend/state
backend/uploads

Guidelines:

* routes should only handle HTTP logic
* business logic must stay inside services
* database access should be centralized
* AI logic must stay isolated in aiService

---

# AI Integration Rules

When generating AI responses:

* always use conversation history
* avoid generating responses without context
* responses must be concise and natural
* system prompts must define assistant personality

---

# Important Files

Backend entrypoint:

backend/server.js

Frontend entrypoint:

frontend/src/app/page.tsx

Environment configuration:

backend/.env
frontend/.env.local

---

# Development Guidelines for AI Agents

When modifying code:

1. Always follow the architecture defined above
2. Avoid creating duplicate services
3. Prefer extending existing modules
4. Maintain separation of concerns
5. Do not move files unless necessary

---

# Goals for Future Development

* multi-tenant SaaS support
* conversation analytics
* appointment integrations
* CRM integrations
* improved AI prompt orchestration

---

# Notes for AI Assistants

When analyzing the repository:

* treat the backend as the system core
* treat the frontend as a visualization layer
* prioritize services when understanding logic
* ignore node_modules and build folders
