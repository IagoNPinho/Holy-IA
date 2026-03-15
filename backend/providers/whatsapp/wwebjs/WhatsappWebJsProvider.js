const { WhatsappProvider } = require("../base/WhatsappProvider");

class WhatsappWebJsProvider extends WhatsappProvider {
  getName() {
    return "wwebjs";
  }
}

module.exports = { WhatsappWebJsProvider };
