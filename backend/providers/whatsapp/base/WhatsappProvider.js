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
}

module.exports = { WhatsappProvider };
