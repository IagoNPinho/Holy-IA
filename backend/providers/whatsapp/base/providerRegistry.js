const { env } = require("../../../config/env");
const { WahaProvider } = require("../waha/WahaProvider");
const { EvolutionProvider } = require("../evolution/EvolutionProvider");
const { WhatsappWebJsProvider } = require("../wwebjs/WhatsappWebJsProvider");

function getProvider() {
  const name = (env.WHATSAPP_PROVIDER || "waha").toLowerCase();
  if (name === "waha") return new WahaProvider();
  if (name === "evolution") return new EvolutionProvider();
  if (name === "wwebjs") return new WhatsappWebJsProvider();
  return new WahaProvider();
}

module.exports = { getProvider };
