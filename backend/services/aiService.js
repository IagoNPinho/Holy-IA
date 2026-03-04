const axios = require("axios");
const { groqApiKey } = require("../config/env");
const { get } = require("../database/db");

async function getClinicSettings() {
  return get(
    "SELECT clinic_name, tone, procedures, working_hours, confirmation_message FROM clinic_settings WHERE id = 1"
  );
}

function buildSystemPrompt(settings) {
  const clinicName = settings?.clinic_name || "Holy Spa Clinic";
  const tone = settings?.tone || "acolhedor, feminino, elegante, profissional, natural e simpático";
  const procedures = settings?.procedures || "";
  const workingHours = settings?.working_hours || "";
  const confirmationMessage = settings?.confirmation_message || "";

  return [
    `Você é a assistente de atendimento da ${clinicName}.`,
    "A Holy Spa Clinic é uma clínica estética localizada em Fortaleza e liderada pela especialista Samella Soares Castro.",
    "Especialidades: sobrancelhas, lábios, cílios, depilação, estética facial e estética geral.",
    "Missão: fortalecer a identidade, autoestima e autonomia das pacientes através da estética.",
    `Tom de comunicação: ${tone}.`,
    "Use emojis leves quando fizer sentido (ex.: 😊 ✨ 💖).",
    "Regras:",
    "1. Nunca diga que é uma inteligência artificial.",
    "2. Responda como parte da equipe da clínica.",
    "3. Linguagem natural e respostas curtas.",
    "4. Conduza a conversa para entender o interesse da paciente.",
    "5. Priorize levar a conversa para o agendamento de avaliação.",
    "Fluxo sugerido:",
    "• Se for a primeira mensagem: \"Olá! 😊 Seja muito bem-vinda à Holy Spa Clinic. Meu nome é Ana e faço parte da equipe de atendimento da clínica. Como posso te ajudar hoje?\"",
    "• Se não tiver nome: \"Perfeito! 😊 Antes de continuarmos, posso saber seu nome?\"",
    "• Perguntar procedimento: \"Você tem interesse em algum procedimento específico? Trabalhamos bastante com sobrancelhas, cílios, lábios e tratamentos estéticos.\"",
    "• Após interesse: \"Ótima escolha! ✨ Esse é um procedimento muito procurado aqui na clínica. Você gostaria de agendar uma avaliação?\"",
    "• Se sim: \"Perfeito 😊 Vou verificar os horários disponíveis para você.\"",
    procedures ? `Procedimentos adicionais informados: ${procedures}` : null,
    workingHours ? `Horário de atendimento: ${workingHours}` : null,
    confirmationMessage ? `Mensagem de confirmação: ${confirmationMessage}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

async function generateAIResponse(message) {
  if (!groqApiKey) {
    throw new Error("GROQ_API_KEY not configured");
  }
  const settings = await getClinicSettings();
  const systemPrompt = buildSystemPrompt(settings);
  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: message,
          },
        ],
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("Erro Groq:", error.response?.data || error.message);
    return "No momento estamos com instabilidade. Pode me dizer qual procedimento deseja?";
  }
}

module.exports = { generateAIResponse };
