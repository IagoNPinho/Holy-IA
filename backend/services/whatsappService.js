// WhatsApp integration and message processing.
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const { env } = require("../config/env");
const { get, run, all } = require("../database/db");
const { generateAIResponse } = require("./aiService");
const { isAiEnabled } = require("../state/systemState");

let client = null;
let latestQr = null;
let connectionStatus = "disconnected";

function log(level, message, meta = {}) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    ...meta,
  };
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(payload));
}

async function ensureConversation(contactId, contactName) {
  let conversation = await get(
    "SELECT id, contact_id, contact_name FROM conversations WHERE contact_id = ?",
    [contactId]
  );

  if (!conversation) {
    const result = await run(
      "INSERT INTO conversations (contact_id, contact_name) VALUES (?, ?)",
      [contactId, contactName || null]
    );
    conversation = { id: result.lastID, contact_id: contactId, contact_name: contactName || null };
  }

  return conversation;
}

async function saveMessage({ conversationId, direction, body, messageId, fromNumber, toNumber }) {
  await run(
    `
    INSERT INTO messages (conversation_id, direction, body, message_id, from_number, to_number)
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [conversationId, direction, body, messageId || null, fromNumber || null, toNumber || null]
  );
}

async function buildHistory(conversationId, limit = 8) {
  const rows = await all(
    `
    SELECT direction, body
    FROM messages
    WHERE conversation_id = ?
    ORDER BY id DESC
    LIMIT ?
    `,
    [conversationId, limit]
  );

  return rows
    .reverse()
    .map((row) => ({
      role: row.direction === "out" ? "assistant" : "user",
      content: row.body,
    }));
}

async function handleIncomingMessage(message) {
  try {
    const contact = await message.getContact();
    const contactId = message.from;
    const contactName = contact?.pushname || contact?.name || contactId;

    const conversation = await ensureConversation(contactId, contactName);

    await saveMessage({
      conversationId: conversation.id,
      direction: "in",
      body: message.body,
      messageId: message.id?.id,
      fromNumber: contactId,
      toNumber: message.to,
    });

    if (!isAiEnabled()) {
      log("info", "ai_disabled_skip_reply", { contactId });
      return;
    }

    const reply = await generateAIResponse(message.body);

    await client.sendMessage(contactId, reply);
    await saveMessage({
      conversationId: conversation.id,
      direction: "out",
      body: reply,
      messageId: null,
      fromNumber: message.to,
      toNumber: contactId,
    });
  } catch (error) {
    log("error", "message_handling_failed", { error: error?.message });
  }
}

async function initWhatsappClient() {
  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: "./session"
    }),
    puppeteer: {
      headless: true,
    },
  });

  client.on("qr", (qr) => {
    latestQr = qr;
    connectionStatus = "qr";
    log("info", "whatsapp_qr_received");
    qrcode.generate(qr, { small: true });
  });

  client.on("ready", () => {
    connectionStatus = "ready";
    log("info", "whatsapp_ready");
  });

  client.on("authenticated", () => {
    connectionStatus = "authenticated";
    log("info", "whatsapp_authenticated");
  });

  client.on("auth_failure", (msg) => {
    connectionStatus = "auth_failure";
    log("error", "whatsapp_auth_failure", { message: msg });
  });

  client.on("disconnected", (reason) => {
    connectionStatus = "disconnected";
    log("warn", "whatsapp_disconnected", { reason });
  });

  client.on("message", handleIncomingMessage);

  await client.initialize();
}

function getWhatsappClient() {
  return client;
}

function getLatestQr() {
  return latestQr;
}

function getConnectionStatus() {
  return connectionStatus;
}

async function sendManualMessage({ to, body }) {
  if (!client) throw new Error("WhatsApp client not initialized");
  const convo = await ensureConversation(to, to);
  await client.sendMessage(to, body);
  await saveMessage({
    conversationId: convo.id,
    direction: "out",
    body,
    messageId: null,
    fromNumber: null,
    toNumber: to,
  });
}

// Mass sending logic with basic safety controls (no spam behavior).
async function sendBulk({ recipients, body, delayMs }) {
  if (!client) throw new Error("WhatsApp client not initialized");
  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw new Error("Recipients list is required");
  }

  const safeDelay = Math.max(env.BULK_MIN_DELAY_MS, delayMs || env.BULK_MIN_DELAY_MS);
  if (recipients.length > env.BULK_MAX_RECIPIENTS) {
    throw new Error(`Max recipients exceeded (${env.BULK_MAX_RECIPIENTS})`);
  }

  for (const to of recipients) {
    await sendManualMessage({ to, body });
    // Basic pacing to avoid abuse.
    await new Promise((resolve) => setTimeout(resolve, safeDelay));
  }
}

// Simple scheduled sending using in-memory timers (MVP).
function scheduleSend({ id, to, body, sendAt, onScheduled }) {
  if (!client) throw new Error("WhatsApp client not initialized");
  const delay = sendAt.getTime() - Date.now();
  if (delay <= 0) {
    throw new Error("sendAt must be in the future");
  }

  const timer = setTimeout(async () => {
    try {
      await sendManualMessage({ to, body });
      if (onScheduled) onScheduled(null);
    } catch (error) {
      if (onScheduled) onScheduled(error);
    }
  }, delay);

  return timer;
}

module.exports = {
  initWhatsappClient,
  getWhatsappClient,
  getLatestQr,
  getConnectionStatus,
  sendManualMessage,
  sendBulk,
  scheduleSend,
};
