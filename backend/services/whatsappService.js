// WhatsApp integration and message processing.
const path = require("path");
const fs = require("fs");
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const { env } = require("../config/env");
const { get, run, all } = require("../database/db");
const { generateAIResponse } = require("./aiService");
const { getAiEnabled } = require("./settingsService");
const { detectIntent } = require("./intentRouter");
const { getPromptByIntent } = require("./promptRouter");
const { getState, transitionState } = require("./conversationState");
const { splitAiResponse } = require("./aiUtils");
const { sendEvent } = require("./sseService");
const { scheduleFollowups } = require("./followUpService");
const { getAvailableSlots } = require("./scheduleService");

let client = null;
let latestQr = null;
let connectionStatus = "disconnected";
let messageSchema = null;
let watchdogTimer = null;
let restarting = false;
const processedMessageIds = new Map();
const processedMessageKeys = new Map();

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
    const globalAiEnabled = await getAiEnabled();
    const aiEnabledValue = globalAiEnabled ? 1 : 0;
    await run(
      "INSERT OR IGNORE INTO conversations (contact_id, name, ai_enabled, updated_at) VALUES (?, ?, ?, datetime('now'))",
      [contactId, contactName || null, aiEnabledValue]
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

async function ensureContact(contactId) {
  const row = await get("SELECT id FROM contacts WHERE phone_number = ?", [contactId]);
  if (!row) {
    await run("INSERT OR IGNORE INTO contacts (phone_number) VALUES (?)", [contactId]);
  }
  await run("UPDATE contacts SET last_seen_at = datetime('now') WHERE phone_number = ?", [contactId]);
}

async function upsertPatientMemory({
  contactId,
  patientName,
  lastIntent,
  lastProcedureDiscussed,
}) {
  await run(
    `
    INSERT OR IGNORE INTO patient_memory (contact_id, patient_name, last_intent, last_procedure_discussed)
    VALUES (?, ?, ?, ?)
    `,
    [contactId, patientName || null, lastIntent || null, lastProcedureDiscussed || null]
  );

  await run(
    `
    UPDATE patient_memory
    SET
      patient_name = COALESCE(?, patient_name),
      last_intent = COALESCE(?, last_intent),
      last_procedure_discussed = COALESCE(?, last_procedure_discussed),
      updated_at = datetime('now')
    WHERE contact_id = ?
    `,
    [patientName || null, lastIntent || null, lastProcedureDiscussed || null, contactId]
  );
}

function extractPatientName(text) {
  if (!text) return null;
  const normalized = text.toLowerCase();
  const patterns = [
    /meu nome é\s+([a-zÀ-ÿ\s]{2,40})/i,
    /meu nome eh\s+([a-zÀ-ÿ\s]{2,40})/i,
    /eu sou\s+([a-zÀ-ÿ\s]{2,40})/i,
    /pode me chamar de\s+([a-zÀ-ÿ\s]{2,40})/i,
    /^sou\s+([a-zÀ-ÿ\s]{2,40})/i,
  ];
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match && match[1]) {
      const name = match[1].trim().replace(/\s+/g, " ");
      if (name.length >= 2) return name;
    }
  }
  return null;
}

function extractProcedure(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  const known = [
    "botox",
    "preenchimento",
    "limpeza de pele",
    "microagulhamento",
    "peeling",
    "laser",
    "sobrancelha",
    "cílios",
    "cilios",
    "lábios",
    "labios",
    "depilação",
    "depilacao",
  ];
  for (const item of known) {
    if (lower.includes(item)) return item;
  }
  return null;
}

async function loadMessageSchema() {
  if (messageSchema) return messageSchema;
  const rows = await all(`PRAGMA table_info(messages)`);
  const direction = rows.find((row) => row.name === "direction");
  const fromMe = rows.find((row) => row.name === "from_me");
  const messageType = rows.find((row) => row.name === "message_type");
  messageSchema = {
    hasDirection: Boolean(direction),
    directionNotNull: Boolean(direction && direction.notnull),
    hasFromMe: Boolean(fromMe),
    hasMessageType: Boolean(messageType),
  };
  return messageSchema;
}

async function saveMessage({ conversationId, fromMe, body, timestamp, messageType, intent, mediaType, mediaUrl, mimeType }) {
  const schema = await loadMessageSchema();
  const direction = fromMe ? "out" : "in";
  const finalType = messageType || (fromMe ? "manual" : "incoming");
  if (schema.hasDirection && schema.hasFromMe && schema.hasMessageType) {
    await run(
      `
      INSERT INTO messages (conversation_id, from_me, body, timestamp, direction, message_type, intent, media_type, media_url, mime_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        conversationId,
        fromMe ? 1 : 0,
        body,
        timestamp || new Date().toISOString(),
        direction,
        finalType,
        intent || null,
        mediaType || null,
        mediaUrl || null,
        mimeType || null,
      ]
    );
    return;
  }

  if (schema.hasDirection && schema.hasMessageType) {
    await run(
      `
      INSERT INTO messages (conversation_id, body, timestamp, direction, message_type, intent, media_type, media_url, mime_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        conversationId,
        body,
        timestamp || new Date().toISOString(),
        direction,
        finalType,
        intent || null,
        mediaType || null,
        mediaUrl || null,
        mimeType || null,
      ]
    );
    return;
  }

  if (schema.hasDirection) {
    await run(
      `
      INSERT INTO messages (conversation_id, body, timestamp, direction, intent, media_type, media_url, mime_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        conversationId,
        body,
        timestamp || new Date().toISOString(),
        direction,
        intent || null,
        mediaType || null,
        mediaUrl || null,
        mimeType || null,
      ]
    );
    return;
  }

  await run(
    `
    INSERT INTO messages (conversation_id, from_me, body, timestamp, intent, media_type, media_url, mime_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      conversationId,
      fromMe ? 1 : 0,
      body,
      timestamp || new Date().toISOString(),
      intent || null,
      mediaType || null,
      mediaUrl || null,
      mimeType || null,
    ]
  );
}

async function buildHistory(conversationId, limit = 10) {
  const rows = await all(
    `
    SELECT from_me, body, created_at
    FROM messages
    WHERE conversation_id = ?
    ORDER BY COALESCE(created_at, timestamp, id) DESC
    LIMIT ?
    `,
    [conversationId, limit]
  );

  return rows
    .reverse()
    .map((row) => ({
      role: row.from_me ? "assistant" : "user",
      content: typeof row.body === "string" ? row.body.trim() : "",
    }))
    .filter((row) => row.content && (row.role === "user" || row.role === "assistant"));
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

async function updateConversationIncoming({ id, name, lastMessage }) {
  await run(
    `
    UPDATE conversations
    SET name = COALESCE(?, name),
        last_message = ?,
        updated_at = datetime('now'),
        unread_count = COALESCE(unread_count, 0) + 1
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

async function saveIncomingMedia(message) {
  if (!message?.hasMedia) return null;
  const media = await message.downloadMedia();
  if (!media || !media.data) return null;

  const uploadsDir = path.join(__dirname, "..", "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const extFromMime = media.mimetype ? media.mimetype.split("/")[1] : "";
  const extFromName = media.filename ? path.extname(media.filename).replace(".", "") : "";
  const ext = extFromName || extFromMime || "bin";
  const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const filePath = path.join(uploadsDir, filename);
  const buffer = Buffer.from(media.data, "base64");
  fs.writeFileSync(filePath, buffer);

  return {
    mediaType: message.type || "media",
    mimeType: media.mimetype || null,
    mediaUrl: `/uploads/${filename}`,
  };
}

async function handleIncomingMessage(message) {
  try {
    if (message?.fromMe) {
      return;
    }
    const contact = await message.getContact();
    const contactId = message.from;
    if (
      contactId === "status@broadcast" ||
      contactId?.includes("@newsletter") ||
      contactId?.includes("@g.us")
    ) {
      log("info", "skip_broadcast_message", { contactId });
      return;
    }
    const contactName = contact?.pushname || contact?.name || contactId;

    const conversation = await ensureConversation(contactId, contactName);
    await ensureContact(contactId);
    const now = Date.now();
    const messageId = message?.id?.id || message?.id?._serialized;
    const fallbackKey = `${contactId}:${message?.body || ""}:${message?.timestamp || ""}`;
    const dedupeKey = messageId ? `id:${messageId}` : `fallback:${fallbackKey}`;
    const last = processedMessageIds.get(dedupeKey) || processedMessageKeys.get(dedupeKey);
    if (last && now - last < 5 * 60 * 1000) {
      log("info", "duplicate_message_skipped", { messageId, contactId, dedupeKey });
      return;
    }
    if (messageId) {
      processedMessageIds.set(dedupeKey, now);
    } else {
      processedMessageKeys.set(dedupeKey, now);
    }
    if (processedMessageIds.size + processedMessageKeys.size > 5000) {
      for (const [key, value] of processedMessageIds) {
        if (now - value > 10 * 60 * 1000) {
          processedMessageIds.delete(key);
        }
      }
      for (const [key, value] of processedMessageKeys) {
        if (now - value > 10 * 60 * 1000) {
          processedMessageKeys.delete(key);
        }
      }
    }
    const timestamp = message.timestamp
      ? new Date(message.timestamp * 1000).toISOString()
      : new Date().toISOString();

    const { intent } = detectIntent(message.body);
    const patientName = extractPatientName(message.body);
    const shouldUpdateProcedure = intent === "procedure_question" || intent === "price_question";
    const procedure = shouldUpdateProcedure ? extractProcedure(message.body) : null;
    await upsertPatientMemory({
      contactId,
      patientName,
      lastIntent: intent,
      lastProcedureDiscussed: procedure,
    });
    const prevState = getState(conversation.id);
    const nextState = transitionState(conversation.id, intent);
    const intentPrompt = getPromptByIntent(intent);
    const statePrompt = `Estado da conversa: ${prevState} -> ${nextState}.`;
    const extraSystemPrompt = `${intentPrompt}\n${statePrompt}`;
    const media = await saveIncomingMedia(message);
    const mediaPreview = media
      ? media.mediaType === "image"
        ? "📷 Foto"
        : media.mediaType === "video"
          ? "🎥 Vídeo"
          : media.mediaType === "audio" || media.mediaType === "ptt"
            ? "🎧 Áudio"
            : "📎 Documento"
      : null;
    const lastMessageText = message.body || mediaPreview || "";

    await saveMessage({
      conversationId: conversation.id,
      fromMe: false,
      body: message.body,
      timestamp,
      messageType: "incoming",
      intent,
      mediaType: media?.mediaType || null,
      mediaUrl: media?.mediaUrl || null,
      mimeType: media?.mimeType || null,
    });
    await updateConversationIncoming({
      id: conversation.id,
      name: contactName,
      lastMessage: lastMessageText,
    });
    sendEvent("message_received", {
      conversationId: conversation.id,
      contactId,
    });
    sendEvent("conversation_updated", { conversationId: conversation.id });

    const block = await get("SELECT contact_id FROM ai_blocklist WHERE contact_id = ?", [contactId]);
    if (block) {
      log("info", "ai_blocked_contact", { contactId });
      return;
    }
    const aiEnabled = await getAiEnabled();
    if (!aiEnabled) {
      log("info", "ai_disabled_global", { contactId });
      return;
    }
    if (conversation?.ai_enabled === 0) {
      log("info", "ai_disabled_for_conversation", { contactId, conversationId: conversation?.id });
      return;
    }

    await scheduleFollowups({ contactId, conversationId: conversation.id });

    const history = await buildHistory(conversation.id, 10);
    let slotsPrompt = "";
    if (intent === "appointment_request" || intent === "schedule_request") {
      const today = new Date().toISOString().slice(0, 10);
      const slots = await getAvailableSlots(today);
      if (slots.length) {
        const list = slots.join(", ");
        console.info(`[SCHEDULE] suggested slots: ${list}`);
        slotsPrompt = `Horários disponíveis hoje:\n${slots.join("\n")}\nPergunte qual prefere.`;
      } else {
        slotsPrompt =
          "Hoje estamos com agenda cheia, mas posso verificar horários para amanhã. 😊";
      }
    }
    const memory = await get(
      `
      SELECT patient_name, interests, last_procedure_discussed, last_intent, notes
      FROM patient_memory
      WHERE contact_id = ?
      `,
      [contactId]
    );
    const memoryLines = [];
    if (memory?.patient_name) memoryLines.push(`Nome: ${memory.patient_name}`);
    if (memory?.interests) memoryLines.push(`Interesses: ${memory.interests}`);
    if (memory?.last_procedure_discussed)
      memoryLines.push(`Último procedimento discutido: ${memory.last_procedure_discussed}`);
    if (memory?.last_intent) memoryLines.push(`Última intenção: ${memory.last_intent}`);
    if (memory?.notes) memoryLines.push(`Notas: ${memory.notes}`);
    const memoryPrompt = memoryLines.length ? `Contexto do paciente:\n${memoryLines.join("\n")}` : "";

    const reply = await generateAIResponse({
      message: message.body,
      history,
      extraSystemPrompt: [extraSystemPrompt, memoryPrompt, slotsPrompt].filter(Boolean).join("\n"),
      contactId,
    });
    const responses = splitAiResponse(reply, { ideal: 120, max: 220, maxMessages: 3 });
    const messagesToSend = responses.length ? responses : [reply];

    await new Promise((resolve) => setTimeout(resolve, env.HUMAN_BASE_DELAY_MS));

    for (let i = 0; i < messagesToSend.length; i += 1) {
      const body = messagesToSend[i];
      await client.sendMessage(contactId, body);
      await saveMessage({
        conversationId: conversation.id,
        fromMe: true,
        body,
        timestamp: new Date().toISOString(),
        messageType: "ai",
      });
      await updateConversation({
        id: conversation.id,
        name: contactName,
        lastMessage: body,
      });
      sendEvent("message_sent", { conversationId: conversation.id });
      sendEvent("conversation_updated", { conversationId: conversation.id });
      if (i < messagesToSend.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, env.HUMAN_SPLIT_DELAY_MS));
      }
    }

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
    authStrategy: new LocalAuth({
      clientId: env.WHATSAPP_CLIENT_ID,
      dataPath: "/var/www/.wwebjs_auth",
    }),
    puppeteer: {
      // VPS-friendly Chromium flags to avoid sandbox/GPU crashes.
      headless: "new",
      executablePath: "/usr/bin/chromium",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-extensions",
        "--disable-background-networking",
        "--disable-sync",
        "--disable-background-timer-throttling",
        "--disable-renderer-backgrounding",
        "--disable-features=site-per-process",
        "--window-size=1280,720",
      ],
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
    console.info("[WHATSAPP] Client ready");
    syncInitialChats(client)
      .then(async (result) => {
        const { getConversationCount } = require("../database/db");
        const total = await getConversationCount();
        console.info("whatsapp_sync_result", {
          chats_found: result.chatsFound,
          chats_saved: result.chatsSaved,
          total_in_db: total,
        });
      })
      .catch((error) => {
        log("error", "whatsapp_sync_failed", { error: error?.message });
      });
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
    console.warn("[WHATSAPP] Client disconnected", { reason });
  });

  client.on("message", handleIncomingMessage);

  await client.initialize();
  startWatchdog();
}

function startWatchdog() {
  if (watchdogTimer) return;
  watchdogTimer = setInterval(async () => {
    console.info("[WATCHDOG] Checking system health");
    if (connectionStatus === "ready" || connectionStatus === "authenticated") {
      return;
    }
    if (restarting) return;
    restarting = true;
    try {
      console.warn("[WATCHDOG] WhatsApp disconnected, attempting restart");
      if (client) {
        try {
          await client.destroy();
        } catch (error) {
          log("warn", "whatsapp_destroy_failed", { error: error?.message });
        }
      }
      await initWhatsappClient();
    } catch (error) {
      log("error", "whatsapp_watchdog_failed", { error: error?.message });
    } finally {
      restarting = false;
    }
  }, 60000);
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
  await ensureContact(to);
  await client.sendMessage(to, body);
  await saveMessage({
    conversationId: convo.id,
    fromMe: true,
    body,
    timestamp: new Date().toISOString(),
    messageType: "manual",
  });
  await updateConversation({
    id: convo.id,
    name: convo.name || to,
    lastMessage: body,
  });
  sendEvent("message_sent", { conversationId: convo.id });
  sendEvent("conversation_updated", { conversationId: convo.id });
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

async function syncInitialChats(clientInstance) {
  const activeClient = clientInstance || client;
  if (!activeClient) {
    throw new Error("WhatsApp client not initialized");
  }

  const globalAiEnabled = await getAiEnabled();
  const aiEnabledValue = globalAiEnabled ? 1 : 0;
  const chats = await activeClient.getChats();
  const directChats = chats.filter((chat) => !chat.isGroup);
  let chatsSaved = 0;

  for (const chat of directChats) {
    const contactId = chat.id?._serialized || chat.id?.user || chat.id;
    const name = chat.name || chat.pushname || chat.id?.user || contactId;
    const timestamp = chat.timestamp || chat.lastMessage?.timestamp;
    const updatedAt = timestamp ? new Date(timestamp * 1000).toISOString() : new Date().toISOString();
    const lastMessage = chat.lastMessage?.body || "";

    const result = await run(
      `
      INSERT OR IGNORE INTO conversations (contact_id, name, last_message, updated_at, ai_enabled)
      VALUES (?, ?, ?, ?, ?)
      `,
      [contactId, name, lastMessage, updatedAt, aiEnabledValue]
    );
    if (result?.changes) chatsSaved += 1;
    await ensureContact(contactId);
  }

  return { chatsFound: directChats.length, chatsSaved };
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
  syncInitialChats,
};
