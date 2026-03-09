# Holy AI System Overview

> Generated: 2026-03-07
> Scope: Repository analysis only. No code changes were made.

# Holy AI — Project Context

## Overview

Holy AI is a WhatsApp automation SaaS designed for clinics, especially aesthetic clinics.

The system provides:

- WhatsApp message handling
- CRM-style conversation management
- AI-assisted responses
- reactivation campaigns
- outbound campaigns to existing contacts
- operational dashboards
- metrics and follow-up automation

The current stage of the project focuses on **operating reliably with 1 clinic and 1 WhatsApp number**.

The architecture is intentionally designed to allow future expansion to multiple clinics and numbers without rewriting the system.

---

# Current Deployment

Frontend
- Next.js
- Hosted on Vercel

Backend
- Node.js
- Express
- Hosted on Hostinger VPS

Realtime
- Server Sent Events (SSE)

Database
- SQLite

WhatsApp Integration
- whatsapp-web.js

Process Manager
- PM2

Reverse Proxy
- Nginx

---

# Current Product Scope

Phase 1 goal:

Operate **1 clinic with 1 WhatsApp number** reliably with:

- conversation inbox
- message sending
- AI assistant
- CRM lead tracking
- reactivation flows
- outbound campaigns
- metrics dashboard

---

# Key Architectural Principles

1. One WhatsApp number = one session
2. System must support multiple numbers in the future
3. Every conversation belongs to a clinic
4. Backend must remain lightweight for VPS hosting
5. Real-time updates via SSE
6. Avoid overengineering until needed
7. Documentation is the source of truth

---

# Data Model Philosophy

All operational data must eventually support:

- clinic_id
- instance_id (WhatsApp session)

For the current stage, a default clinic and instance are used.

---

# Security and Compliance Principles

The system must:

- only message contacts belonging to the clinic
- support opt-out
- allow manual control of campaigns
- maintain message logs
- avoid uncontrolled message automation

---

# 30-Day Development Focus

The current development cycle focuses on stabilizing the MVP for real-world operation.

Main goals:

1️⃣ Fix frontend and backend integration  
2️⃣ Ensure WhatsApp messaging reliability  
3️⃣ Activate CRM functionality  
4️⃣ Implement reactivation flows  
5️⃣ Implement outbound campaigns  
6️⃣ Improve operational metrics  
7️⃣ Prepare architecture for multiple clinics

---

# Immediate Priority

Week 1.1:

Make the system work reliably for **1 clinic / 1 number** with:

- messaging
- CRM
- reactivation
- outbound campaigns
- metrics