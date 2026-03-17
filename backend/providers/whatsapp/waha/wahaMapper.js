const { normalizeInboundPayload } = require("../base/providerTypes");

function mapInbound(body) {
  try {
    // If payload is already in Inbox Lite shape, pass through.
    if (body?.externalChatId && body?.externalMessageId && body?.contact?.phone) {
      return normalizeInboundPayload(body);
    }

    const payload = body?.payload || {};
    const rawChatId =
      payload?.from ||
      body?.chatId ||
      body?.chat_id ||
      body?.from ||
      body?.data?.from ||
      null;
    const externalChatId =
      typeof rawChatId === "string" ? rawChatId.replace(/@lid$/, "@c.us") : rawChatId;

    const externalMessageId =
      payload?.id ||
      body?.messageId ||
      body?.message_id ||
      body?.id ||
      body?.data?.id ||
      null;

    const isGroup = typeof payload?.from === "string" && payload.from.endsWith("@g.us");
    let contactPhone =
      (isGroup ? payload?.participant : null) ||
      payload?.from ||
      body?.contact?.phone ||
      body?.from ||
      body?.data?.from ||
      null;
    if (typeof contactPhone === "string") {
      contactPhone = contactPhone.replace(/@lid$/, "@c.us");
    }

    if (payload?.from === "status@broadcast") {
      contactPhone = payload?.from;
      console.info(
        JSON.stringify({
          ts: new Date().toISOString(),
          level: "info",
          message: "waha_inbound_skip_broadcast",
          from: payload?.from,
        })
      );
    } else if (isGroup) {
      console.info(
        JSON.stringify({
          ts: new Date().toISOString(),
          level: "info",
          message: "waha_inbound_skip_group",
          from: payload?.from,
          participant: payload?.participant || null,
        })
      );
    }

    const contactName =
      body?.contact?.name ||
      payload?.senderName ||
      body?.senderName ||
      body?.data?.senderName ||
      null;

    const text =
      payload?.body ||
      body?.message?.text ||
      body?.text ||
      body?.payload?.text ||
      body?.data?.text ||
      "";

    const messageType =
      body?.message?.type ||
      body?.type ||
      body?.payload?.type ||
      body?.data?.type ||
      "text";

    const timestamp =
      payload?.timestamp ||
      body?.timestamp ||
      body?.payload?.timestamp ||
      body?.data?.timestamp ||
      new Date().toISOString();

    const normalized = normalizeInboundPayload({
      instanceId: body?.session || body?.instanceId || body?.instance_id || "default",
      externalChatId,
      externalMessageId,
      contact: {
        phone: contactPhone,
        name: contactName,
      },
      message: {
        type: messageType,
        text,
        fromMe: payload?.fromMe,
        participant: payload?.participant,
        to: payload?.to,
        hasMedia: payload?.hasMedia,
      },
      timestamp,
    });

    return normalized;
  } catch (error) {
    console.warn(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: "warn",
        message: "waha_inbound_parse_failed",
        error: error?.message || "parse_failed",
        topLevelKeys: Object.keys(body || {}),
        payloadKeys: Object.keys(body?.payload || {}),
        event: body?.event || null,
        session: body?.session || null,
      })
    );
    throw error;
  }
}

module.exports = { mapInbound };
