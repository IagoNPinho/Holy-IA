// Provider-neutral shapes for inbound/outbound operations.
// Keep minimal to avoid coupling frontend contracts.

function requireString(value, field) {
  if (!value || typeof value !== "string") {
    const error = new Error(`Missing or invalid ${field}`);
    error.field = field;
    throw error;
  }
}

function normalizeInboundPayload(payload) {
  requireString(payload.externalChatId, "externalChatId");
  requireString(payload.externalMessageId, "externalMessageId");
  requireString(payload.contact?.phone, "contact.phone");
  return payload;
}

module.exports = {
  requireString,
  normalizeInboundPayload,
};
