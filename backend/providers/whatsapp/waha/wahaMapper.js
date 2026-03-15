const { normalizeInboundPayload } = require("../base/providerTypes");

function mapInbound(body) {
  // If payload is already in Inbox Lite shape, pass through.
  if (body?.externalChatId && body?.externalMessageId && body?.contact?.phone) {
    return normalizeInboundPayload(body);
  }

  // Basic WAHA-ish payload support (best-effort, non-breaking).
  const externalChatId =
    body?.chatId ||
    body?.chat_id ||
    body?.from ||
    body?.payload?.from ||
    body?.data?.from ||
    null;

  const externalMessageId =
    body?.messageId ||
    body?.message_id ||
    body?.id ||
    body?.payload?.id ||
    body?.data?.id ||
    null;

  const contactPhone =
    body?.contact?.phone ||
    body?.from ||
    body?.payload?.from ||
    body?.data?.from ||
    null;

  const contactName =
    body?.contact?.name ||
    body?.senderName ||
    body?.payload?.senderName ||
    body?.data?.senderName ||
    null;

  const text =
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
    body?.timestamp ||
    body?.payload?.timestamp ||
    body?.data?.timestamp ||
    new Date().toISOString();

  return normalizeInboundPayload({
    instanceId: body?.instanceId || body?.instance_id || "default",
    externalChatId,
    externalMessageId,
    contact: {
      phone: contactPhone,
      name: contactName,
    },
    message: {
      type: messageType,
      text,
    },
    timestamp,
  });
}

module.exports = { mapInbound };
