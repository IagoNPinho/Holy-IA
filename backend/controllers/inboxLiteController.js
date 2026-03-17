const { sendEvent } = require("../services/sseService");
const { get } = require("../database/db");
const {
  normalizePhone,
  upsertContact,
  upsertConversation,
  persistInboundMessage,
  persistOutboundMessage,
  listConversations,
  listMessages,
  setAiEnabled,
  updateOutboundStatus,
  setOutboundProviderMessageId,
  syncMessagesFromProvider,
} = require("../services/inboxLiteService");
const { getProvider } = require("../providers/whatsapp/base/providerRegistry");

function log(level, message, meta = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), level, message, ...meta }));
}

function emitSse(type, payload, logMessage) {
  const result = sendEvent(type, payload);
  log("info", logMessage, {
    event: type,
    conversationId: payload?.conversationId || null,
    messageId: payload?.message?.id || null,
    contactId: payload?.contactId || null,
    bodyPreview: (payload?.message?.content || payload?.message?.text_content || payload?.lastMessage || "").slice(0, 20),
    emitted: (result?.sent || 0) > 0,
  });
}

async function inboundWebhook(req, res, next) {
  try {
    const provider = getProvider();
    log("info", "inbound_webhook_payload", {
      body: req.body || {},
    });
    const payload = provider.parseInboundEvent(req.body || {});
    const externalChatId = payload.externalChatId || payload.contact?.phone;
    const externalMessageId = payload.externalMessageId;
    const contactPhone = normalizePhone(payload.contact?.phone || externalChatId);
    const contactName = payload.contact?.name || contactPhone;
    const messageType = payload.message?.type || "text";
    const text = payload.message?.text || "";
    const timestamp = payload.timestamp || new Date().toISOString();

    const contactId = await upsertContact({ phone: contactPhone, name: contactName });
    const conversationId = await upsertConversation({
      externalChatId,
      contactId,
      instanceId: payload.instanceId || null,
      channel: "whatsapp",
    });

    const messageId = await persistInboundMessage({
      conversationId,
      contactId,
      externalMessageId,
      text,
      messageType,
      externalTimestamp: timestamp,
    });

    emitSse(
      "message_received",
      {
        conversationId,
        contactId,
        message: {
          id: messageId,
          conversationId,
          content: text,
          sender: "contact",
          timestamp,
          messageType: "incoming",
        },
      },
      "sse_emit_message_received"
    );
    emitSse(
      "conversation_updated",
      {
        conversationId,
        contactId,
        lastMessage: text,
        updatedAt: timestamp,
      },
      "sse_emit_conversation_updated"
    );

    return res.json({
      ok: true,
      conversationId,
      aiEnabled: true,
      shouldRunAi: true,
    });
  } catch (error) {
    log("error", "inbound_webhook_failed", { error: error?.message });
    return next(error);
  }
}

async function outboundStatusWebhook(req, res, next) {
  try {
    const { externalMessageId, status } = req.body || {};
    if (!externalMessageId) return res.status(400).json({ error: "externalMessageId required" });
    await updateOutboundStatus({ externalMessageId, status });
    log("info", "outbound_status_updated", { externalMessageId, status });
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
}

async function getConversations(req, res, next) {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const rows = await listConversations(limit, offset);
    const data = rows.map((row) => ({
      id: row.id,
      contactName: row.contact_name || row.contact_phone,
      lastMessage: row.last_message_preview || "",
      timestamp: row.last_message_at || row.updated_at,
      unread: row.unread_count || 0,
      aiEnabled: Boolean(row.ai_enabled),
      status: row.status || "new",
    }));
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

async function getMessages(req, res, next) {
  try {
    const { id } = req.params;
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const convo = await get(
      `
      SELECT c.id, c.external_chat_id, c.instance_id, c.contact_id, c.last_message_at
      FROM conversations_lite c
      WHERE c.id = ?
      `,
      [id]
    );
    let rows = await listMessages(id, limit);
    const provider = getProvider();
    const canSync =
      Boolean(convo?.external_chat_id) &&
      typeof provider.fetchRecentMessages === "function";

    if (!canSync) {
      log("info", "sync_skipped", {
        conversationId: id,
        reason: "provider_unavailable",
      });
    } else if (rows.length >= limit) {
      log("info", "sync_skipped", {
        conversationId: id,
        reason: "already_loaded",
        count: rows.length,
      });
    } else {
      log("info", "sync_started", {
        conversationId: id,
        externalChatId: convo.external_chat_id,
        existingCount: rows.length,
        limit,
      });
      try {
        const fetched = await provider.fetchRecentMessages({
          sessionId: convo.instance_id || "default",
          externalChatId: convo.external_chat_id,
          limit,
        });
        log("info", "sync_fetched_count", {
          conversationId: id,
          count: fetched.length,
        });
        const result = await syncMessagesFromProvider({
          conversationId: id,
          contactId: convo.contact_id,
          messages: fetched,
        });
        log("info", "sync_inserted_count", {
          conversationId: id,
          count: result.inserted,
        });
        log("info", "sync_deduped_count", {
          conversationId: id,
          count: result.deduped,
        });
        if (result.inserted > 0) {
          rows = await listMessages(id, limit);
        }
      } catch (error) {
        log("warn", "sync_failed", { conversationId: id, error: error?.message });
      }
    }
    const data = rows
      .slice()
      .reverse()
      .map((row) => ({
        id: row.id,
        conversationId: row.conversation_id,
        content: row.text_content || "",
        sender: row.sender_type === "ai" ? "ai" : row.direction === "outbound" ? "user" : "contact",
        timestamp: row.external_timestamp || row.created_at,
        messageType: row.message_type || (row.direction === "outbound" ? "manual" : "incoming"),
        status: row.status,
      }));
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

async function sendManual(req, res, next) {
  try {
    const { id } = req.params;

    const messageBody =
      typeof req.body === "string"
        ? req.body
        : req.body?.body || req.body?.text || req.body?.content || "";

    if (!messageBody || typeof messageBody !== "string") {
      return res.status(400).json({ error: "message body is required" });
    }

    const conv = await get(
      `
      SELECT c.id, c.contact_id, co.phone
      FROM conversations_lite c
      JOIN contacts_lite co ON co.id = c.contact_id
      WHERE c.id = ?
      `,
      [id]
    );

    if (!conv) {
      return res.status(404).json({ error: "conversation not found" });
    }

    const savedId = await persistOutboundMessage({
      conversationId: conv.id,
      contactId: conv.contact_id,
      text: messageBody,
      messageType: "text",
      status: "queued",
    });

    const provider = getProvider();
    let providerMessageId = null;
    try {
      const sendResult = await provider.sendText({
        to: conv.phone,
        text: messageBody,
        instanceId: "default",
      });
      providerMessageId = sendResult?.providerMessageId || null;
      if (providerMessageId) {
        await setOutboundProviderMessageId(savedId, providerMessageId, sendResult?.status || "sent");
      }
    } catch (error) {
      log("error", "provider_send_failed", { error: error?.message, conversationId: conv.id });
    }

    emitSse(
      "message_sent",
      {
        conversationId: conv.id,
        contactId: conv.contact_id,
        message: {
          id: savedId,
          externalMessageId: providerMessageId || null,
          conversationId: conv.id,
          content: messageBody,
          sender: "user",
          timestamp: new Date().toISOString(),
          messageType: "manual",
        },
      },
      "sse_emit_message_sent"
    );

    emitSse(
      "conversation_updated",
      {
        conversationId: conv.id,
        contactId: conv.contact_id,
        lastMessage: messageBody,
        updatedAt: new Date().toISOString(),
      },
      "sse_emit_conversation_updated"
    );

    return res.json({ ok: true, messageId: savedId });
  } catch (error) {
    return next(error);
  }
}

async function toggleAi(req, res, next) {
  try {
    const { id } = req.params;
    const { enabled } = req.body || {};
    const value = enabled ? 1 : 0;
    await setAiEnabled(id, enabled);
    emitSse(
      "conversation_updated",
      {
        conversationId: id,
        contactId: null,
        lastMessage: null,
        updatedAt: new Date().toISOString(),
      },
      "sse_emit_conversation_updated"
    );
    return res.json({ ok: true, aiEnabled: Boolean(value) });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  inboundWebhook,
  outboundStatusWebhook,
  getConversations,
  getMessages,
  sendManual,
  toggleAi,
};
