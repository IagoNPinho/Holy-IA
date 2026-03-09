# Holy AI – Project Index

## Overview
Holy AI é um SaaS de automação de WhatsApp com IA para clínicas.
O sistema recebe mensagens via WhatsApp Web, processa intenções com IA
(OpenAI com fallback Groq), armazena dados em SQLite e transmite
eventos em tempo real para um dashboard Next.js via SSE.

---

# Architecture

client (Next.js dashboard)
↓
API (Express backend)
↓
Services Layer
↓
AI Orchestrator
↓
External Systems

- WhatsApp Web
- OpenAI
- Groq
- Clínica Experts API

---

# Repository Structure

## Backend

backend/
- config → variáveis de ambiente e configuração
- controllers → lógica de requisições HTTP
- routes → definição das rotas da API
- services → lógica de negócio e integrações
- middleware → autenticação e interceptores
- database → SQLite e migrations
- state → estado global do sistema
- scripts → importação e utilidades

Entry point:

backend/server.js

---

## Frontend

frontend/src/

- app → rotas Next.js
- components → UI e layout
- modules → módulos de domínio
- hooks → hooks reutilizáveis
- services → API client
- store → estado global
- utils → helpers

Principais módulos:

modules/
- conversations
- crm
- followups
- metrics
- whatsapp

---

# Core Services

## AI Layer

services/

- aiService → comunicação com LLM
- modelRouter → escolha do modelo
- promptRouter → escolha de prompt
- intentRouter → roteamento por intenção
- intentService → classificação de intenção

---

## WhatsApp Layer

- whatsappService → integração com whatsapp-web.js
- conversationState → controle de contexto
- followUpService → follow-ups automáticos

---

## External Integrations

- clinicaExpertsService → integração com sistema de clínicas

---

# Realtime System

Server Sent Events (SSE)

backend/services/sseService.js

Fluxo:

WhatsApp Event
→ backend service
→ database update
→ SSE broadcast
→ dashboard update

---

# Data Layer

Database: SQLite

database/
- db.js
- migrations.js
- whatsapp.sqlite

---

# Deployment

PM2 ecosystem:

backend/ecosystem.config.js

CI/CD:

.github/workflows/deploy.yml

---

# AI Documentation

docs/

- AI_CONTEXT.md
- AI_MEMORY.md
- architecture.md
- FAILURE_PATTERNS.md
- codebase-map.md