const { WhatsappProvider } = require("../base/WhatsappProvider");

class EvolutionProvider extends WhatsappProvider {
  getName() {
    return "evolution";
  }
}

module.exports = { EvolutionProvider };
