const express = require("express");
const { getStatus } = require("../services/whatsappService");
const { env } = require("../config/env");

const router = express.Router();

router.get("/health", (_req, res) => {
  const status = env.INBOX_LITE_MODE ? "disabled" : getStatus();
  const whatsappReady = status === "ready" || status === "authenticated";
  res.json({
    status: "ok",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    whatsapp: whatsappReady,
    timestamp: new Date().toISOString(),
  });
});

module.exports = { healthRouter: router };
