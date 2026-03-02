const axios = require("axios");
const { groqApiKey } = require("../config/env");

async function generateAIResponse(message) {
  if (!groqApiKey) {
    throw new Error("GROQ_API_KEY not configured");
  }
  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama3-8b-8192", 
        messages: [
          {
            role: "system",
            content: `Você é assistente virtual da Holy Spa Clinic.
Seja acolhedora, profissional e objetiva.
Nunca diga que é uma IA.
Responda de forma curta e finalize incentivando agendamento.`
          },
          {
            role: "user",
            content: message
          }
        ],
        temperature: 0.7
      },
      {
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("Erro Groq:", error.response?.data || error.message);
    return "No momento estamos com instabilidade. Pode me dizer qual procedimento deseja?";
  }
}

module.exports = { generateAIResponse };
