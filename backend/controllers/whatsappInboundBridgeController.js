// WAHA/provider inbound bridge for legacy panel persistence.
const { getProvider } = require("../providers/whatsapp/base/providerRegistry");
const {
  normalizePhone,
  upsertContact,
  upsertConversation,
  persistInboundMessage,
} = require("../services/inboxLiteService");
const { sendEvent } = require("../services/sseService");

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

async function inboundLegacyWebhook(req, res, next) {
  try {
    if (req?.body?.event && req.body.event !== "message") {
      log("info", "provider_inbound_event_ignored", {
        event: req.body.event,
        session: req.body.session || null,
      });
      return res.json({ ok: true, ignored: true });
    }
    const provider = getProvider();
    log("info", "provider_inbound_webhook_received", {
      provider: provider.getName(),
      route: "/api/webhooks/whatsapp/inbound-legacy",
    });

    let normalized;
    try {
      normalized = provider.parseInboundEvent(req.body);
    } catch (error) {
      log("warn", "provider_inbound_parse_failed", {
        error: error?.message || "parse_failed",
      });
      return res.status(400).json({ error: error?.message || "Invalid payload" });
    }

    log("info", "provider_inbound_parsed", {
      externalChatId: normalized.externalChatId || null,
      externalMessageId: normalized.externalMessageId || null,
      contactPhone: normalized.contact?.phone || null,
      bodyPreview: (normalized.message?.text || "").slice(0, 20),
    });

    const externalChatId = normalized.externalChatId || normalized.contact?.phone;
    if (!externalChatId) {
      return res.status(400).json({ error: "externalChatId missing" });
    }
    if (externalChatId === "status@broadcast" || externalChatId?.includes("@newsletter")) {
      log("info", "skip_broadcast_message", { contactId: externalChatId });
      return res.json({ ok: true, skipped: "broadcast" });
    }
    if (externalChatId?.includes("@g.us")) {
      log("info", "skip_group_message", { contactId: externalChatId });
      return res.json({ ok: true, skipped: "group" });
    }
    const externalMessageId = normalized.externalMessageId;
    const contactPhone = normalizePhone(normalized.contact?.phone || externalChatId);
    const contactName = normalized.contact?.name || contactPhone;
    const messageType = normalized.message?.type || "text";
    const text = normalized.message?.text || "";
    const timestamp = normalized.timestamp || new Date().toISOString();

    const contactId = await upsertContact({ phone: contactPhone, name: contactName });
    const conversationId = await upsertConversation({
      externalChatId,
      contactId,
      instanceId: normalized.instanceId || null,
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

    const messagePayload = {
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
    };

    const messageResult = sendEvent("message_received", messagePayload);
    log("info", "sse_emit_message_received", {
      event: "message_received",
      conversationId,
      messageId,
      contactId,
      bodyPreview: (text || "").slice(0, 20),
      emitted: (messageResult?.sent || 0) > 0,
    });

    const conversationPayload = {
      conversationId,
      contactId,
      lastMessage: text,
      updatedAt: timestamp,
    };
    const conversationResult = sendEvent("conversation_updated", conversationPayload);
    log("info", "sse_emit_conversation_updated", {
      event: "conversation_updated",
      conversationId,
      messageId,
      contactId,
      bodyPreview: (text || "").slice(0, 20),
      emitted: (conversationResult?.sent || 0) > 0,
    });

    return res.json({ ok: true, conversationId, messageId });
  } catch (error) {
    return next(error);
  }
}

module.exports = { inboundLegacyWebhook };
