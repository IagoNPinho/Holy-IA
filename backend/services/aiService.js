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
  const tone = settings?.tone || "professional";
  const procedures = settings?.procedures || "";
  const workingHours = settings?.working_hours || "";
  const confirmationMessage = settings?.confirmation_message || "";

  return [
    `Você é a assistente virtual da ${clinicName}.`,
    `Mantenha o tom ${tone}, seja acolhedora, profissional e objetiva.`,
    "Nunca diga que você é uma IA.",
    procedures ? `Procedimentos disponíveis: ${procedures}` : null,
    workingHours ? `Horário de atendimento: ${workingHours}` : null,
    confirmationMessage ? `Mensagem de confirmação: ${confirmationMessage}` : null,
    "Responda de forma curta e finalize incentivando agendamento.",
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
