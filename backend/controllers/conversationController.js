// Conversation and message read endpoints.
const { all } = require("../database/db");
const { sendManualMessage } = require("../services/whatsappService");

async function listConversations(_req, res, next) {
  try {
    const conversations = await all(
      `
      SELECT
        c.id,
        c.contact_id,
        c.contact_name,
        c.created_at,
        (
          SELECT body
          FROM messages m
          WHERE m.conversation_id = c.id
          ORDER BY m.id DESC
          LIMIT 1
        ) AS last_message,
        (
          SELECT created_at
          FROM messages m
          WHERE m.conversation_id = c.id
          ORDER BY m.id DESC
          LIMIT 1
        ) AS last_message_at
      FROM conversations c
      ORDER BY last_message_at DESC NULLS LAST, c.created_at DESC
      `
    );
    res.json({ data: conversations });
  } catch (error) {
    next(error);
  }
}

async function listMessages(req, res, next) {
  try {
    const { conversationId } = req.params;
    const messages = await all(
      `
      SELECT id, direction, body, message_id, from_number, to_number, created_at
      FROM messages
      WHERE conversation_id = ?
      ORDER BY id ASC
      `,
      [conversationId]
    );
    res.json({ data: messages });
  } catch (error) {
    next(error);
  }
}

async function sendManual(req, res, next) {
  try {
    const { to, body } = req.body || {};
    if (!to || typeof to !== "string") {
      return res.status(400).json({ error: "Destinatario obrigatorio." });
    }
    if (!body || typeof body !== "string") {
      return res.status(400).json({ error: "Mensagem obrigatoria." });
    }
    await sendManualMessage({ to, body });
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listConversations,
  listMessages,
  sendManual,
};
