const axios = require("axios");
const OpenAI = require("openai");
const { env, groqApiKey } = require("../config/env");
const { get, run } = require("../database/db");
const { detectIntent } = require("./intentRouter");
const { selectModel } = require("./modelRouter");

async function getClinicSettings() {
  return get(
    "SELECT clinic_name, tone, procedures, working_hours, confirmation_message FROM clinic_settings WHERE id = 1"
  );
}

function buildSystemPrompt(settings) {
  const clinicName = settings?.clinic_name || "Holy Spa Clinic";
  const tone = settings?.tone || "simpático, profissional, natural e acolhedor";
  const procedures = settings?.procedures || "";
  const workingHours = settings?.working_hours || "";
  const confirmationMessage = settings?.confirmation_message || "";

  return [
    `Você é a atendente virtual da clínica ${clinicName}.`,
    `Tom: ${tone}.`,
    "Objetivo: atender, qualificar e conduzir ao agendamento.",
    "Fluxo: responda e sempre faça uma pergunta de continuidade.",
    "Se pedirem preço: responda breve e convide a agendar.",
    "Se perguntarem procedimento: explique benefício e pergunte se já fez.",
    "Se houver interesse: ofereça verificar horários.",
    "Estilo: PT-BR, simpática, natural, sem parecer robótica.",
    "Regras: nunca diga que é IA.",
    "Tamanho: ideal até 120 caracteres; máximo 220.",
    "Se precisar, divida em até 3 mensagens curtas.",
    procedures ? `Procedimentos informados pela clínica: ${procedures}` : null,
    workingHours ? `Horário de atendimento: ${workingHours}` : null,
    confirmationMessage ? `Mensagem de confirmação: ${confirmationMessage}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

async function generateAIResponse({ message, history, extraSystemPrompt, contactId }) {
  const settings = await getClinicSettings();
  const basePrompt = buildSystemPrompt(settings);
  const systemPrompt =
    typeof extraSystemPrompt === "string" && extraSystemPrompt.trim()
      ? `${basePrompt}\n\n${extraSystemPrompt.trim()}`
      : basePrompt;
  const safeHistory = Array.isArray(history)
    ? history
        .filter((item) => item && typeof item.content === "string" && typeof item.role === "string")
        .map((item) => ({ role: item.role, content: item.content }))
    : [];
  const trimmedHistory = safeHistory.slice(-6);
  const userMessage = typeof message === "string" ? message : String(message ?? "");
  const finalMessages = [
    { role: "system", content: systemPrompt },
    ...trimmedHistory,
    { role: "user", content: userMessage },
  ];

  const { intent } = detectIntent(userMessage);
  const provider = selectModel(intent);

  const callOpenAI = async () => {
    if (!env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not configured");
    }
    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: env.OPENAI_MODEL || "gpt-4o-mini",
      messages: finalMessages,
      temperature: 0.6,
      max_tokens: 220,
    });
    return {
      content: response.choices[0].message.content,
      model: env.OPENAI_MODEL || "gpt-4o-mini",
      tokens: response.usage?.total_tokens || null,
    };
  };

  const callGroq = async () => {
    if (!groqApiKey) {
      throw new Error("GROQ_API_KEY not configured");
    }
    const response = await axios.post(
      `${env.GROQ_BASE_URL}/chat/completions`,
      {
        model: env.GROQ_MODEL,
        messages: finalMessages,
        temperature: 0.6,
        max_tokens: 220,
      },
      {
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
          "Content-Type": "application/json",
        },
      }
    );
    return {
      content: response.data.choices[0].message.content,
      model: env.GROQ_MODEL,
      tokens: response.data.usage?.total_tokens || null,
    };
  };

  const logUsage = async (provider, model, tokens) => {
    try {
      await run(
        `
        INSERT INTO ai_logs (contact_id, intent, provider, model, tokens)
        VALUES (?, ?, ?, ?, ?)
        `,
        [contactId || null, intent || null, provider, model, tokens]
      );
      if (contactId) {
        console.info(`[AI] provider=${provider} intent=${intent} contact=${contactId}`);
      } else {
        console.info(`[AI] provider=${provider} intent=${intent}`);
      }
    } catch (error) {
      console.warn("ai_log_failed", error?.message || error);
    }
  };

  try {
    if (provider === "openai") {
      const result = await callOpenAI();
      await logUsage("openai", result.model, result.tokens);
      return result.content;
    }
    const result = await callGroq();
    await logUsage("groq", result.model, result.tokens);
    return result.content;
  } catch (error) {
    console.error(`Erro ${provider === "openai" ? "OpenAI" : "Groq"}:`, error.response?.data || error.message);
  }

  try {
    if (provider === "openai") {
      const result = await callGroq();
      await logUsage("groq", result.model, result.tokens);
      return result.content;
    }
    const result = await callOpenAI();
    await logUsage("openai", result.model, result.tokens);
    return result.content;
  } catch (error) {
    console.error("Erro fallback:", error.response?.data || error.message);
    return "Oi! 😊 Posso te ajudar melhor se você me contar qual procedimento procura.";
  }
}

module.exports = { generateAIResponse };






