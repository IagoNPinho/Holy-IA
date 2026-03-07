// Lightweight intent detection for incoming messages.
const INTENTS = {
  greeting: ["oi", "olá", "ola", "bom dia", "boa tarde", "boa noite", "eai", "ei", "oie"],
  procedure_question: ["procedimento", "procedimentos", "tratamento", "tratamentos", "sobrancelha", "cilios", "lábios", "labios", "depil", "estética", "estetica"],
  price_question: ["preço", "preco", "valor", "custa", "quanto", "orçamento", "orcamento"],
  appointment_request: ["agendar", "agendamento", "marcar", "consulta", "avaliação", "avaliacao", "horário", "horario", "disponível", "disponivel"],
  working_hours: ["horário", "horario", "funcionamento", "abre", "fecha", "atendimento", "dias"],
  general_conversation: [],
};

function normalize(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectIntent(message) {
  const text = normalize(message);
  if (!text) return "general_conversation";

  for (const [intent, keywords] of Object.entries(INTENTS)) {
    if (intent === "general_conversation") continue;
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        return intent;
      }
    }
  }

  return "general_conversation";
}

module.exports = {
  detectIntent,
};
