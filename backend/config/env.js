// Centralized environment loader.
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

function requireEnv(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

const env = {
  PORT: Number(process.env.PORT || 5000),
  DB_PATH: process.env.DB_PATH || path.join(__dirname, "..", "database", "whatsapp.sqlite"),
  WHATSAPP_CLIENT_ID: process.env.WHATSAPP_CLIENT_ID || "holy-ia",
  GROQ_API_KEY: requireEnv("GROQ_API_KEY", "") || process.env.GROQ_API_KEY,
  GROQ_BASE_URL: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
  GROQ_MODEL: process.env.GROQ_MODEL || "llama-3.1-70b-versatile",
  AI_DEFAULT_ENABLED: process.env.AI_DEFAULT_ENABLED === "false" ? false : true,
  BULK_MAX_RECIPIENTS: Number(process.env.BULK_MAX_RECIPIENTS || 50),
  BULK_MIN_DELAY_MS: Number(process.env.BULK_MIN_DELAY_MS || 1200),
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN || "https://holy-ai.vercel.app",
  AUTH_EMAIL: process.env.AUTH_EMAIL || "",
  AUTH_PASSWORD: process.env.AUTH_PASSWORD || "",
  JWT_SECRET: process.env.JWT_SECRET || "holy-ia-secret",
};

const groqApiKey = env.GROQ_API_KEY;

module.exports = { env, groqApiKey };
