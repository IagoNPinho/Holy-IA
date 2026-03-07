**Holy AI – VPS Operations Guide**

Guia operacional do servidor de produção do Holy AI SaaS.

**Infraestrutura Atual**
- Provider: Hostinger VPS
- OS: Ubuntu 22.04 LTS
- CPU: 1 vCPU
- RAM: 4 GB
- Storage: 50 GB NVMe

**Stack**
- Backend: Node.js + Express
- WhatsApp: whatsapp-web.js + Puppeteer
- Process Manager: PM2
- Reverse Proxy: Nginx
- AI: Groq / OpenAI
- Database: SQLite
- Frontend: Next.js (Vercel)

**Diretórios Principais**
- `/var/www/Holy-IA`
- `/var/www/uploads`
- `/var/www/.wwebjs_auth`

**Acesso ao Servidor**
Conectar via SSH:
```bash
ssh root@SEU_IP
```
Exemplo:
```bash
ssh root@217.196.xxx.xxx
```

**Estrutura do Servidor**
```text
/var/www
  ├── Holy-IA
  │   ├── backend
  │   └── logs
  ├── uploads
  └── .wwebjs_auth
```

**Função das Pastas**
- `uploads`: arquivos recebidos do WhatsApp
- `.wwebjs_auth`: sessão persistente do WhatsApp
- `logs`: logs do PM2

**Backend**
Diretório:
```bash
cd /var/www/Holy-IA/backend
```

Rodar manualmente:
```bash
node server.js
```

**PM2**
Listar processos:
```bash
pm2 status
```

Ver logs:
```bash
pm2 logs holy-ai-backend
```

Monitor em tempo real:
```bash
pm2 monit
```

Reiniciar backend:
```bash
pm2 restart holy-ai-backend
```

Parar:
```bash
pm2 stop holy-ai-backend
```

Remover processo:
```bash
pm2 delete holy-ai-backend
```

Salvar processos para reboot:
```bash
pm2 save
```

**Atualizar Código no Servidor**
Fluxo padrão:
`VSCode → GitHub → VPS`

Atualizar projeto:
```bash
cd /var/www/Holy-IA
git pull
pm2 restart holy-ai-backend
```

Versão rápida:
```bash
git pull && pm2 restart holy-ai-backend
```

**Logs**
Logs do PM2:
`/var/www/Holy-IA/logs`

Ver logs diretamente:
```bash
tail -f /var/www/Holy-IA/logs/holy-ai-backend-out.log
```

Erros:
```bash
tail -f /var/www/Holy-IA/logs/holy-ai-backend-error.log
```

**WhatsApp Session**
Sessão salva em:
`/var/www/.wwebjs_auth`

Se apagar essa pasta:
o WhatsApp desconecta.

Resetar sessão:
```bash
rm -rf /var/www/.wwebjs_auth
pm2 restart holy-ai-backend
```

**Chromium (necessário para whatsapp-web.js)**
Instalar Chromium:
```bash
apt install -y chromium-browser
```

Bibliotecas necessárias:
```bash
apt install -y \
  fonts-liberation \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libnss3 \
  libxss1 \
  libasound2 \
  libgbm1 \
  libgtk-3-0
```

**Diagnóstico Rápido**
Ver processos Node:
```bash
ps aux | grep node
```

Ver portas abertas:
```bash
ss -tulpn
```

Testar backend:
```bash
curl http://localhost:5000/health
```

**Backup**
Pastas críticas:
- `/var/www/.wwebjs_auth`
- `/var/www/uploads`
- `/var/www/Holy-IA/backend/database`

Backup manual:
```bash
tar -czvf backup_holy_ai.tar.gz /var/www
```

**Reiniciar Servidor**
```bash
reboot
```

Após reboot o PM2 restaura os processos automaticamente.

**Deploy Automático com PM2**
Criar arquivo:
`ecosystem.config.js`

Exemplo:
```js
module.exports = {
  apps: [
    {
      name: "holy-ai-backend",
      script: "server.js",
      cwd: "/var/www/Holy-IA/backend",
      instances: 1,
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production"
      }
    }
  ],

  deploy: {
    production: {
      user: "root",
      host: "SEU_IP",
      ref: "origin/main",
      repo: "https://github.com/IagoNPinho/Holy-IA.git",
      path: "/var/www/Holy-IA",
      "post-deploy": "cd backend && npm install && pm2 restart ecosystem.config.js"
    }
  }
};
```

Rodar deploy:
```bash
pm2 deploy production
```

Atualizar:
```bash
pm2 deploy production update
```

Fluxo final:
`git push → pm2 deploy → servidor atualiza`

**Monitoramento da VPS**
CPU e memória:
```bash
htop
```

Uso de disco:
```bash
df -h
```

Memória:
```bash
free -h
```

**Recomendações para SaaS**
Para escalar Holy AI:
- Redis
- Queue system
- Session manager
- Multi-instance WhatsApp

Isso permitirá suportar:
- 50+ clínicas
- 1000+ mensagens simultâneas

**Segurança Recomendada**
Firewall:
```bash
ufw allow 22
ufw allow 80
ufw allow 443
ufw enable
```

**Observações**
O sistema depende de:
- PM2
- Chromium
- Sessão persistente

Se o WhatsApp parar de funcionar, verificar:
```bash
pm2 logs holy-ai-backend
```
