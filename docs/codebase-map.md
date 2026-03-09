# Mapa do Codebase

## Diretório Raiz
- README.md
- package.json
- tsconfig.json
- .env
- .gitignore

## backend/ 
- server.ts
- app/
  - routes/
    - index.ts
    - users.ts
  - controllers/
    - userController.ts
  - services/
    - userService.ts
    - authService.ts
  - models/
    - user.ts
    - session.ts
  - middlewares/
    - authMiddleware.ts
  - utils/
    - logger.ts
- tests/
  - userService.test.ts
  - authService.test.ts

## frontend/
- next.config.js
- package.json
- public/
  - favicon.ico
  - logo.png
- pages/
  - _app.tsx
  - index.tsx
  - login.tsx
  - dashboard.tsx
- components/
  - Header.tsx
  - Footer.tsx
  - UserForm.tsx
- hooks/
  - useAuth.ts
- styles/
  - globals.css
  - Home.module.css

## docs/
- AI_CONTEXT.md
- architecture.md
- AI_MEMORY.md
- FAILURE_PATTERNS.md
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
### server.ts
- Inicialização do servidor Node.js, configura middlewares e rotas principais.

### app/routes/
- Define as rotas de API para recursos como usuários e autenticação.

### app/controllers/
- Implementa lógica de controle para tratar requisições HTTP, acionando os serviços necessários.

### app/services/
- Contém lógica de negócio central, separando responsabilidades de acesso a dados e regras do domínio.
- userService.ts: Gerenciamento das operações de usuários.
- authService.ts: Gerenciamento de autenticação e sessões.

### app/models/
- Define os modelos de dados (usuários, sessões) utilizados pelo backend.

### app/middlewares/
- Middlewares reutilizáveis, como autenticação e logging.

### app/utils/
- Funções utilitárias, incluindo logger de eventos e erros.

### tests/
- Testes automatizados das funções e integrações do backend.

---

## frontend/
### pages/
- Rotas/componentes de páginas do Next.js; cada arquivo representa uma rota acessível do frontend.

### components/
- Componentes de UI reutilizáveis como cabeçalho, rodapé e formulários de usuário.

### hooks/
- Hooks React customizados, por exemplo, autenticação de usuário.

### styles/
- Arquivos CSS globais e módulos CSS específicos para componentes/páginas.

### public/
- Recursos estáticos como imagens e ícones.

---

## docs/
- Documentação organizacional, contexto de IA, arquitetura e padrões de falha.

## .continue/
- Regras para arquitetura, padrões de código e orquestração de agentes.
