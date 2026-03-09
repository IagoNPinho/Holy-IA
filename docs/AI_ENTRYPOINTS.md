# System Entrypoints

Backend

backend/server.js → main Express entrypoint

Routes

backend/routes/
- ai.js
- auth.js
- conversations.js
- followups.js
- metrics.js
- settings.js
- toggle.js
- whatsapp.js

Core services

backend/services/aiService.js
backend/services/modelRouter.js
backend/services/promptRouter.js
backend/services/intentRouter.js
backend/services/sseService.js
backend/services/whatsappService.js