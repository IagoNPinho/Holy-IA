// Select prompt snippets based on intent.

const defaultPrompt =
  "Responda de forma clara e humana, e faça uma pergunta para continuar a conversa.";

const pricePrompt =
  "Explique o preço de forma breve (se possível, informe que varia) e convide para agendar avaliação.";

const procedurePrompt =
  "Explique benefícios do procedimento e pergunte se a pessoa já fez antes.";

const appointmentPrompt =
  "Demonstre disponibilidade e ofereça verificar horários.";

const workingHoursPrompt =
  "Informe horários de atendimento de forma breve e pergunte qual período a pessoa prefere.";

function getPromptByIntent(intent) {
  switch (intent) {
    case "price_question":
      return pricePrompt;
    case "procedure_question":
      return procedurePrompt;
    case "appointment_request":
      return appointmentPrompt;
    case "working_hours":
      return workingHoursPrompt;
    default:
      return defaultPrompt;
  }
}

module.exports = {
  getPromptByIntent,
  defaultPrompt,
  pricePrompt,
  procedurePrompt,
  appointmentPrompt,
  workingHoursPrompt,
};
