class WhatsappProvider {
  constructor(_opts = {}) {}

  getName() {
    return "base";
  }

  // Parse provider-specific inbound payload into normalized shape.
  // Must return: { instanceId, externalChatId, externalMessageId, contact, message, timestamp }
  parseInboundEvent(_body) {
    throw new Error("parseInboundEvent not implemented");
  }

  // Send outbound text message.
  // Must return: { providerMessageId, status }
  async sendText(_params) {
    throw new Error("sendText not implemented");
  }

  // Fetch recent messages for a chat.
  // Must return array of { externalMessageId, externalChatId, text, timestamp, fromMe, messageType }
  async fetchRecentMessages(_params) {
    throw new Error("fetchRecentMessages not implemented");
  }
}

module.exports = { WhatsappProvider };
