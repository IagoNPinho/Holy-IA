// Main entrypoint for the WhatsApp AI support backend (MVP).
const express = require("express");
const cors = require("cors");
const path = require("path");
const jwt = require("jsonwebtoken");

const { env } = require("./config/env");
const { migrate } = require("./database/migrations");
const { initWhatsappClient, getWhatsappClient } = require("./services/whatsappService");
const { addClient } = require("./services/sseService");
const { loadPendingFollowups } = require("./services/followUpService");
const { conversationsRouter } = require("./routes/conversations");
const { settingsRouter } = require("./routes/settings");
const { toggleRouter } = require("./routes/toggle");
const { whatsappRouter } = require("./routes/whatsapp");
const { aiRouter } = require("./routes/ai");
const { debugRouter } = require("./routes/debug");
const { metricsRouter } = require("./routes/metrics");
const { authRouter } = require("./routes/auth");
const { healthRouter } = require("./routes/health");
const { followupsRouter } = require("./routes/followups");
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
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Basic request logger.
app.use((req, _res, next) => {
  log("info", "http_request", {
    method: req.method,
    path: req.path,
  });
  next();
});

app.use(healthRouter);

function sseAuthRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const tokenFromHeader = header.startsWith("Bearer ") ? header.slice(7) : null;
  const token = tokenFromHeader || req.query.token;
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.user = payload;
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

app.get("/events", sseAuthRequired, (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  res.write(`event: connected\ndata: ${JSON.stringify({ ok: true })}\n\n`);
  addClient(res);
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
app.use(followupsRouter);

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
    await loadPendingFollowups();

    app.listen(env.PORT, () => {
      log("info", "server_started", { port: env.PORT });
      console.info("[SERVER] Holy AI backend started");
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

// Memory watchdog (PM2 will restart if needed).
setInterval(() => {
  const mem = process.memoryUsage().rss / 1024 / 1024;
  if (mem > 700) {
    console.warn("[WATCHDOG] High memory usage detected", { rss_mb: mem.toFixed(0) });
  }
}, 120000);
