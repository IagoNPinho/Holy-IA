// Lightweight intent detection using keyword heuristics.
const INTENT_KEYWORDS = {
  greeting: ["oi", "olá", "ola", "bom dia", "boa tarde", "boa noite", "eai", "ei", "oie"],
  procedure_question: [
    "procedimento",
    "procedimentos",
    "tratamento",
    "tratamentos",
    "botox",
    "preenchimento",
    "laser",
    "limpeza de pele",
    "sobrancelha",
    "cílios",
    "cilios",
    "lábios",
    "labios",
  ],
  price_question: ["preço", "preco", "valor", "quanto custa", "custa", "orçamento", "orcamento"],
  appointment_request: ["agendar", "agendamento", "marcar", "marcar horário", "marcar horario", "consulta", "avaliação", "avaliacao"],
  working_hours: ["horário", "horario", "funcionamento", "abre", "fecha", "atendimento", "dias", "horas"],
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
  if (!text) return { intent: "general_conversation" };

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (intent === "general_conversation") continue;
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        return { intent };
      }
    }
  }

  return { intent: "general_conversation" };
}

module.exports = {
  detectIntent,
};
