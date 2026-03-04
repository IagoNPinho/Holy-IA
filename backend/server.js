// Main entrypoint for the WhatsApp AI support backend (MVP).
const express = require("express");
const cors = require("cors");

const { env } = require("./config/env");
const { migrate } = require("./database/migrations");
const { initWhatsappClient, getWhatsappClient } = require("./services/whatsappService");
const { conversationsRouter } = require("./routes/conversations");
const { settingsRouter } = require("./routes/settings");
const { toggleRouter } = require("./routes/toggle");
const { whatsappRouter } = require("./routes/whatsapp");
const { aiRouter } = require("./routes/ai");
const { debugRouter } = require("./routes/debug");
const { metricsRouter } = require("./routes/metrics");
const { authRouter } = require("./routes/auth");
const { authRequired } = require("./middleware/auth");

const app = express();

// Structured console logger (JSON lines).
function log(level, message, meta = {}) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    ...meta,
  };
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(payload));
}

const allowedOrigins = [env.FRONTEND_ORIGIN || "https://holy-ai.vercel.app", "http://localhost:3000"];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("CORS blocked"));
    },
  })
);
app.use(express.json({ limit: "1mb" }));

// Basic request logger.
app.use((req, _res, next) => {
  log("info", "http_request", {
    method: req.method,
    path: req.path,
  });
  next();
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use(authRouter);
app.use(authRequired);
app.use(conversationsRouter);
app.use(settingsRouter);
app.use(toggleRouter);
app.use(whatsappRouter);
app.use(aiRouter);
app.use(debugRouter);
app.use(metricsRouter);

// Global error handler.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  log("error", "unhandled_error", {
    error: err?.message || "unknown_error",
  });
  res.status(500).json({ error: "Erro interno do servidor." });
});

async function bootstrap() {
  try {
    await migrate();
    await initWhatsappClient();

    app.listen(env.PORT, () => {
      log("info", "server_started", { port: env.PORT });
    });

    const client = getWhatsappClient();
    if (!client) {
      log("warn", "whatsapp_client_not_initialized");
    }
  } catch (error) {
    log("error", "bootstrap_failed", { error: error?.message });
    process.exit(1);
  }
}

bootstrap();
