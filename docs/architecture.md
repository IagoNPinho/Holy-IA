# Arquitetura do Sistema

## Visão Geral

O sistema é estruturado em duas principais camadas: backend e frontend, com uma camada dedicada à orquestração por IA. A comunicação entre as camadas é feita via API REST, e integrações externas são moduladas no backend.

---

## Backend

- **Camada de Rotas (`backend/routes/`)**
  - Responsável pelo mapeamento de endpoints da API, direcionando requisições para seus controladores correspondentes.

- **Controladores (`backend/controllers/`)**
  - Intermediam entre as rotas e os serviços, processando a lógica de entrada e saída de dados das requisições.

- **Serviços (`backend/services/`)**
  - Implementam a lógica central de negócio da aplicação, isolando regras e operações principais.

- **Camada de Modelos (`backend/models/`)**
  - Define os esquemas de dados utilizados no sistema para usuários, sessões e demais entidades do domínio.

- **Camada de Banco de Dados**
  - Gerencia a conexão, persistência e consultas ao banco de dados adotado pelo projeto.

- **Middlewares (`backend/middlewares/`)**
  - Realizam validações, autenticação, logging e manipulação intermediária de requisições HTTP.

- **AI Layer (`backend/ai/`)**
  - Responsável por lógica de orquestração inteligente, utilizando agentes para analisar contexto, propor fluxos e monitorar falhas.

- **Realtime Layer (`backend/realtime/`)**
  - Gerencia protocolos de comunicação em tempo real, como WebSockets, para atualização dinâmica de dados entre backend e clientes.

---

## Frontend

- **Arquitetura baseada em páginas e componentes (Next.js)**
  - As páginas (`frontend/pages/`) representam as rotas do frontend, cada qual com lógica própria.
  - Componentes reutilizáveis são definidos em `frontend/components/`, promovendo consistência visual.

- **Gerenciamento de Estado**
  - Utiliza contextos e hooks customizados para gerenciamento do estado da interface e autenticação.

- **Estilização**
  - Estilos globais e específicos por módulo organizados em `frontend/styles/`.

---

## Orquestração por IA

A camada de IA orquestra o fluxo de agentes responsáveis por análise de contexto, definição de tarefas, desenho arquitetural, implementação de código, testes, revisão, segurança e performance, conforme detalhado em `docs/AI_CONTEXT.md`.

---

## Integrações Externas

- APIs externas são acessadas pelos serviços do backend ou pela camada de integração dedicada quando necessário.
- Autenticações externas e comunicações de dados utilizam middlewares e serviços apropriados.

---

## Fluxo de Requisição/Dados

1. Usuário interage pelo frontend (Next.js), que consome dados da API.
2. Frontend envia requisições HTTP para as rotas do backend.
3. As rotas encaminham para seus respectivos controladores.
4. Controladores acionam serviços para processar lógica de negócio.
5. Serviços acessam os modelos e o banco de dados para ler/gravar informações.
6. Respostas são retornadas do backend para o frontend.
7. Eventos em tempo real são acionados pela realtime layer quando necessário.
8. A orquestração por IA pode interagir em todo fluxo para tomada de decisões automatizadas e análise de falhas.

```

---

```markdown docs/codebase-map.md
# Mapa do Codebase

## Diretório Raiz
- README.md
- package.json
- tsconfig.json
- .gitignore

## backend/
- index.ts                  # Ponto de entrada do backend
- database.ts               # Configuração do banco de dados
- routes/
  - api.ts                  # Rotas de API
- controllers/
  - userController.ts       # Controlador de usuário
- services/
  - userService.ts          # Serviço do usuário
  - aiService.ts            # Serviço de orquestração por IA
- ai/
  - orchestrator.ts         # Orquestrador de agentes IA
- realtime/
  - websocket.ts            # Gerenciamento de conexões WebSocket
- middlewares/
  - auth.ts                 # Middleware de autenticação
- models/
  - user.ts                 # Modelo de usuário

## frontend/
- next.config.js
- package.json
- pages/
  - _app.tsx
  - index.tsx
  - login.tsx
  - dashboard.tsx
- components/
  - Header.tsx
  - Footer.tsx
  - UserMenu.tsx
- styles/
  - globals.css

## docs/
- AI_CONTEXT.md
- architecture.md
- codebase-map.md
- module-responsibilities.md

## .continue/
- rules/
  - architecture-rules.md
  - coding-standards.md
  - orchestrator-rules.md

```

---

```markdown docs/module-responsibilities.md
# Responsabilidades dos Módulos

## backend/

### Controllers
- **controllers/userController.ts**
  - Recebe requisições das rotas de usuário, valida dados de entrada e interage com os serviços.

### Services
- **services/userService.ts**
  - Implementa regras de negócio e atua entre controladores e modelo de dados do usuário.
- **services/aiService.ts**
  - Gerencia a orquestração dos agentes e fluxos automatizados com base nos requisitos da IA.

### Routes
- **routes/api.ts**
  - Define endpoints públicos e privados do backend, encaminha requisições para os controladores.

### AI Layer
- **ai/orchestrator.ts**
  - Implementa lógica de orquestração, coordenação de agentes e monitoração do fluxo inteligente do sistema.

### Realtime Layer
- **realtime/websocket.ts**
  - Gerencia conexões WebSocket, distribuição de eventos e atualizações em tempo real.

### Database Layer
- **database.ts**
  - Responsável pela conexão e manutenção dos dados persistidos.
- **models/user.ts**
  - Define a estrutura de dados do usuário e as operações relacionadas no banco de dados.

### Middlewares
- **middlewares/auth.ts**
  - Valida sessões, autenticação e autorização de usuários.

---

## frontend/

### Pages
- Arquivos em `frontend/pages/` mapeiam as páginas principais da aplicação. Exemplo: index, login, dashboard.

### Components
- **components/Header.tsx, Footer.tsx, UserMenu.tsx**
  - Componentes de interface reutilizáveis em todo o frontend.

### Styles
- **styles/globals.css**
  - Estilos globais aplicados em toda a aplicação.

---

## docs/
- Mantém os arquivos de documentação, especificações de arquitetura e regras do sistema.

---

## .continue/
- Armazena arquivos de regras e padrões seguidos pelos agentes durante o ciclo de desenvolvimento.
