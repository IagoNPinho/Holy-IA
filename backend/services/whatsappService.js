// WhatsApp integration and message processing.
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const { env } = require("../config/env");
const { get, run, all } = require("../database/db");
const { generateAIResponse } = require("./aiService");
const { getAiEnabled } = require("./settingsService");

let client = null;
let latestQr = null;
let connectionStatus = "disconnected";
let messageSchema = null;

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
    "SELECT id, contact_id, name, ai_enabled FROM conversations WHERE contact_id = ?",
    [contactId]
  );

  if (!conversation) {
    await run(
      "INSERT OR IGNORE INTO conversations (contact_id, name, ai_enabled, updated_at) VALUES (?, ?, 1, datetime('now'))",
      [contactId, contactName || null]
    );
    conversation = await get(
      "SELECT id, contact_id, name, ai_enabled FROM conversations WHERE contact_id = ?",
      [contactId]
    );
  }

  if (conversation && !conversation.name && contactName) {
    await run("UPDATE conversations SET name = ?, updated_at = datetime('now') WHERE id = ?", [
      contactName,
      conversation.id,
    ]);
    conversation.name = contactName;
  }

  return conversation;
}

async function loadMessageSchema() {
  if (messageSchema) return messageSchema;
  const rows = await all(`PRAGMA table_info(messages)`);
  const direction = rows.find((row) => row.name === "direction");
  const fromMe = rows.find((row) => row.name === "from_me");
  messageSchema = {
    hasDirection: Boolean(direction),
    directionNotNull: Boolean(direction && direction.notnull),
    hasFromMe: Boolean(fromMe),
  };
  return messageSchema;
}

async function saveMessage({ conversationId, fromMe, body, timestamp }) {
  const schema = await loadMessageSchema();
  const direction = fromMe ? "out" : "in";
  if (schema.hasDirection && schema.hasFromMe) {
    await run(
      `
      INSERT INTO messages (conversation_id, from_me, body, timestamp, direction)
      VALUES (?, ?, ?, ?, ?)
      `,
      [conversationId, fromMe ? 1 : 0, body, timestamp || new Date().toISOString(), direction]
    );
    return;
  }

  if (schema.hasDirection) {
    await run(
      `
      INSERT INTO messages (conversation_id, body, timestamp, direction)
      VALUES (?, ?, ?, ?)
      `,
      [conversationId, body, timestamp || new Date().toISOString(), direction]
    );
    return;
  }

  await run(
    `
    INSERT INTO messages (conversation_id, from_me, body, timestamp)
    VALUES (?, ?, ?, ?)
    `,
    [conversationId, fromMe ? 1 : 0, body, timestamp || new Date().toISOString()]
  );
}

async function buildHistory(conversationId, limit = 8) {
  const rows = await all(
    `
    SELECT from_me, body
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
      role: row.from_me ? "assistant" : "user",
      content: row.body,
    }));
}

async function updateConversation({ id, name, lastMessage }) {
  await run(
    `
    UPDATE conversations
    SET name = COALESCE(?, name),
        last_message = ?,
        updated_at = datetime('now')
    WHERE id = ?
    `,
    [name || null, lastMessage || null, id]
  );
}

async function saveAiLog({ conversationId, prompt, response }) {
  await run(
    `
    INSERT INTO ai_logs (conversation_id, prompt, response)
    VALUES (?, ?, ?)
    `,
    [conversationId, prompt, response]
  );
}

async function handleIncomingMessage(message) {
  try {
    const contact = await message.getContact();
    const contactId = message.from;
    if (
      contactId === "status@broadcast" ||
      contactId?.includes("@newsletter") ||
      contactId?.includes("@g.us") ||
      contactId?.includes("@lid")
    ) {
      log("info", "skip_broadcast_message", { contactId });
      return;
    }
    const contactName = contact?.pushname || contact?.name || contactId;

    const conversation = await ensureConversation(contactId, contactName);
    const timestamp = message.timestamp
      ? new Date(message.timestamp * 1000).toISOString()
      : new Date().toISOString();

    await saveMessage({
      conversationId: conversation.id,
      fromMe: false,
      body: message.body,
      timestamp,
    });
    await updateConversation({
      id: conversation.id,
      name: contactName,
      lastMessage: message.body,
    });

    const aiEnabled = await getAiEnabled();
    if (conversation?.ai_enabled === 0) {
      log("info", "ai_disabled_for_conversation", { contactId, conversationId: conversation?.id });
      return;
    }
    if (conversation?.ai_enabled == null && !aiEnabled) {
      log("info", "ai_disabled_skip_reply", { contactId });
      return;
    }

    const reply = await generateAIResponse(message.body);

    await client.sendMessage(contactId, reply);
    await saveMessage({
      conversationId: conversation.id,
      fromMe: true,
      body: reply,
      timestamp: new Date().toISOString(),
    });
    await updateConversation({
      id: conversation.id,
      name: contactName,
      lastMessage: reply,
    });
    await saveAiLog({
      conversationId: conversation.id,
      prompt: message.body,
      response: reply,
    });
  } catch (error) {
    log("error", "message_handling_failed", { error: error?.message });
  }
}

async function initWhatsappClient() {
  client = new Client({
    authStrategy: new LocalAuth({ clientId: env.WHATSAPP_CLIENT_ID }),
    puppeteer: {
      headless: true,
    },
  });

  client.on("qr", (qr) => {
    latestQr = qr;
    connectionStatus = "not_authenticated";
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
    connectionStatus = "not_authenticated";
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

function getStatus() {
  return connectionStatus;
}

async function disconnect() {
  if (!client) {
    connectionStatus = "disconnected";
    return { status: connectionStatus };
  }
  try {
    await client.logout();
  } catch (error) {
    log("warn", "whatsapp_logout_failed", { error: error?.message });
  }
  try {
    await client.destroy();
  } catch (error) {
    log("warn", "whatsapp_destroy_failed", { error: error?.message });
  }
  latestQr = null;
  connectionStatus = "disconnected";
  return { status: connectionStatus };
}

async function sendManualMessage({ to, body }) {
  if (!client) throw new Error("WhatsApp client not initialized");
  const convo = await ensureConversation(to, to);
  await client.sendMessage(to, body);
  await saveMessage({
    conversationId: convo.id,
    fromMe: true,
    body,
    timestamp: new Date().toISOString(),
  });
  await updateConversation({
    id: convo.id,
    name: convo.name || to,
    lastMessage: body,
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
  getStatus,
  disconnect,
  sendManualMessage,
  sendBulk,
  scheduleSend,
};
