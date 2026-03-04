// Conversation and message read endpoints.
const { all, run } = require("../database/db");
const { sendManualMessage } = require("../services/whatsappService");

async function listConversations(req, res, next) {
  try {
    const limit = Math.min(Number.parseInt(req.query.limit, 10) || 20, 100);
    const offset = Math.max(Number.parseInt(req.query.offset, 10) || 0, 0);
    console.info("conversations_query_params", { limit, offset });
    const conversations = await all(
      `
      SELECT
        c.id,
        COALESCE(c.name, c.contact_name, c.contact_id) AS name,
        COALESCE(c.ai_enabled, 1) AS ai_enabled,
        COALESCE(c.unread_count, 0) AS unread_count,
        COALESCE(
          c.last_message,
          (
            SELECT m.body
            FROM messages m
            WHERE m.conversation_id = c.id
            ORDER BY COALESCE(m.timestamp, m.created_at, m.id) DESC
            LIMIT 1
          )
        ) AS last_message,
        COALESCE(
          c.updated_at,
          (
            SELECT COALESCE(m.timestamp, m.created_at)
            FROM messages m
            WHERE m.conversation_id = c.id
            ORDER BY COALESCE(m.timestamp, m.created_at, m.id) DESC
            LIMIT 1
          )
        ) AS updated_at
      FROM conversations c
      ORDER BY updated_at IS NULL, updated_at DESC
      LIMIT ? OFFSET ?
      `,
      [limit, offset]
    );
    console.info("conversations_query_result", { returned: conversations.length });
    res.json({ data: conversations });
  } catch (error) {
    next(error);
  }
}

async function listMessages(req, res, next) {
  try {
    const { conversationId } = req.params;
    const limit = Math.min(Number.parseInt(req.query.limit, 10) || 100, 500);
    const before = req.query.before;
    const messages = await all(
      `
      SELECT
        id,
        COALESCE(from_me, CASE WHEN direction = 'out' THEN 1 ELSE 0 END) AS from_me,
        body,
        COALESCE(timestamp, created_at) AS timestamp,
        message_type
      FROM messages
      WHERE conversation_id = ?
      ${before ? "AND COALESCE(timestamp, created_at) < ?" : ""}
      ORDER BY COALESCE(timestamp, created_at) DESC
      LIMIT ?
      `,
      before ? [conversationId, before, limit] : [conversationId, limit]
    );
    res.json({ data: messages });
  } catch (error) {
    next(error);
  }
}

async function sendManual(req, res, next) {
  try {
    const { to, body, conversationId } = req.body || {};
    if (!conversationId && (!to || typeof to !== "string")) {
      return res.status(400).json({ error: "Destinatario obrigatorio." });
    }
    if (!body || typeof body !== "string") {
      return res.status(400).json({ error: "Mensagem obrigatoria." });
    }
    let target = to;
    if (conversationId) {
      const rows = await all(
        "SELECT contact_id FROM conversations WHERE id = ? LIMIT 1",
        [conversationId]
      );
      target = rows?.[0]?.contact_id;
    }
    if (!target) {
      return res.status(404).json({ error: "Conversa nao encontrada." });
    }
    await sendManualMessage({ to: target, body });
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
}

async function toggleConversationAi(req, res, next) {
  try {
    const { conversationId } = req.params;
    const { enabled } = req.body || {};
    const value = enabled ? 1 : 0;
    await run(
      `
      UPDATE conversations
      SET ai_enabled = ?, updated_at = datetime('now')
      WHERE id = ?
      `,
      [value, conversationId]
    );
    return res.json({ ok: true, aiEnabled: Boolean(value) });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listConversations,
  listMessages,
  sendManual,
  toggleConversationAi,
};
