// Main entrypoint for the WhatsApp AI support backend (MVP).
const express = require("express");
const cors = require("cors");
const path = require("path");
const jwt = require("jsonwebtoken");

const { env } = require("./config/env");
const { migrate } = require("./database/migrations");
const {
  initWhatsappClient,
  getWhatsappClient,
  getStatus: getWhatsappStatus,
  getLatestQr,
} = require("./services/whatsappService");
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
const { inboxLitePublicRouter, inboxLitePrivateRouter } = require("./routes/inboxLite");

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

const allowedOrigins = [
  env.FRONTEND_ORIGIN || "https://holy-ai.vercel.app",
  "https://holy-ai.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://192.168.1.5:3000",
];
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("CORS blocked"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));
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
app.use(inboxLitePublicRouter);

function sseAuthRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const tokenFromHeader = header.startsWith("Bearer ") ? header.slice(7) : null;
  const queryTokenRaw = Array.isArray(req.query.token) ? req.query.token[0] : req.query.token;
  const tokenFromQuery =
    typeof queryTokenRaw === "string"
      ? queryTokenRaw.startsWith("Bearer ")
        ? queryTokenRaw.slice(7)
        : queryTokenRaw
      : null;
  const token = tokenFromHeader || tokenFromQuery;
  if (!token) {
    log("warn", "sse_auth_failed", {
      reason: "missing_token",
      hasHeader: Boolean(tokenFromHeader),
      hasQuery: Boolean(tokenFromQuery),
    });
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.user = payload;
    log("info", "sse_auth_success", {
      source: tokenFromHeader ? "header" : "query",
      userId: payload?.id || payload?.userId || null,
    });
    return next();
  } catch (error) {
    log("warn", "sse_auth_failed", {
      reason: error?.message || "invalid_token",
    });
    return res.status(401).json({ error: "Unauthorized" });
  }
}

app.get("/events", sseAuthRequired, (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  res.write(`event: connected\ndata: ${JSON.stringify({ ok: true })}\n\n`);
  const status = getWhatsappStatus();
  if (status === "ready" || status === "authenticated") {
    res.write(`event: ready\ndata: ${JSON.stringify({ status })}\n\n`);
  } else {
    res.write(`event: disconnected\ndata: ${JSON.stringify({ status })}\n\n`);
  }
  const latestQr = getLatestQr();
  if (latestQr) {
    res.write(`event: qr\ndata: ${JSON.stringify({ qr: latestQr })}\n\n`);
  }
  addClient(res);
});

app.use(authRouter);
app.use(authRequired);
app.use(inboxLitePrivateRouter);
app.use(conversationsRouter);
app.use(settingsRouter);
app.use(toggleRouter);
if (!env.INBOX_LITE_MODE) {
  app.use(whatsappRouter);
}
app.use(aiRouter);
app.use(debugRouter);
app.use(metricsRouter);
app.use(followupsRouter);

// Global error handler.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  log("error", "unhandled_error", {
    error: err?.message || "unknown_error",
    errorStack: err?.stack || null,
    method: req?.method || null,
    path: req?.path || null,
    conversationId: req?.params?.conversationId || req?.body?.conversationId || null,
    messageId: req?.body?.messageId || req?.body?.id || null,
    messageType: req?.body?.messageType || req?.body?.type || null,
    resolvedChatId: err?.resolvedChatId || null,
  });
  res.status(500).json({ error: "Erro interno do servidor." });
});

async function bootstrap() {
  try {
    await migrate();
    if (!env.INBOX_LITE_MODE) {
      await initWhatsappClient();
      await loadPendingFollowups();
    }

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



