const express = require("express");
const { get } = require("../database/db");
const { scheduleFollowups } = require("../services/followUpService");
const { sendManualMessage } = require("../services/whatsappService");

const router = express.Router();

router.post("/followups/schedule", async (req, res, next) => {
  try {
    const { conversationId } = req.body || {};
    if (!conversationId) {
      return res.status(400).json({ error: "conversationId obrigatorio." });
    }
    const convo = await get("SELECT contact_id FROM conversations WHERE id = ? LIMIT 1", [
      conversationId,
    ]);
    if (!convo?.contact_id) {
      return res.status(404).json({ error: "Conversa nao encontrada." });
    }
    await scheduleFollowups({ contactId: convo.contact_id, conversationId });
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

router.post("/followups/remind", async (req, res, next) => {
  try {
    const { conversationId, body } = req.body || {};
    if (!conversationId) {
      return res.status(400).json({ error: "conversationId obrigatorio." });
    }
    const convo = await get("SELECT contact_id FROM conversations WHERE id = ? LIMIT 1", [
      conversationId,
    ]);
    if (!convo?.contact_id) {
      return res.status(404).json({ error: "Conversa nao encontrada." });
    }
    const message =
      typeof body === "string" && body.trim()
        ? body.trim()
        : "Oi! Posso ajudar em algo ou verificar horarios para voce?";
    await sendManualMessage({ to: convo.contact_id, body: message, skipFollowup: true });
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

module.exports = { followupsRouter: router };
