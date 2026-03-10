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
let watchdogBlockUntil = 0;
let transientErrorUntil = 0;
let lastQrAt = null;
let lastAuthAt = null;
let lastReadyAt = null;
let lastStateChangeAt = null;
let lastDisconnectedAt = null;
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

function blockWatchdog(ms, reason) {
  watchdogBlockUntil = Math.max(watchdogBlockUntil, Date.now() + ms);
  log("info", "watchdog_blocked", {
    reason,
    until: new Date(watchdogBlockUntil).toISOString(),
  });
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

  if (conversation && contactName) {
    const shouldUpdateName =
      !conversation.name || conversation.name === conversation.contact_id || conversation.name === "undefined";
    if (shouldUpdateName) {
      await run(
        "UPDATE conversations SET name = ?, contact_name = ?, updated_at = datetime('now') WHERE id = ?",
        [contactName, contactName, conversation.id]
      );
      conversation.name = contactName;
    }
  }

  return conversation;
}

function normalizeContactId(contactId) {
  if (!contactId || typeof contactId !== "string") return contactId;
  if (contactId.endsWith("@lid")) {
    return contactId.replace(/@lid$/, "@c.us");
  }
  return contactId;
}

async function findConversationByContactId(rawContactId, normalizedContactId) {
  let conversation = await get(
    "SELECT id, contact_id, name, ai_enabled FROM conversations WHERE contact_id = ?",
    [rawContactId]
  );
  if (!conversation && normalizedContactId && normalizedContactId !== rawContactId) {
    conversation = await get(
      "SELECT id, contact_id, name, ai_enabled FROM conversations WHERE contact_id = ?",
      [normalizedContactId]
    );
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

function getMessageTimestampIso(message) {
  if (message?.timestamp) {
    return new Date(message.timestamp * 1000).toISOString();
  }
  return new Date().toISOString();
}

function getMediaPreviewLabel(mediaType) {
  if (mediaType === "image") return "ðŸ“· Foto";
  if (mediaType === "video") return "ðŸŽ¥ VÃ­deo";
  if (mediaType === "audio" || mediaType === "ptt") return "ðŸŽ§ Ãudio";
  return "ðŸ“Ž Documento";
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
    const result = await run(
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
    return result?.lastID;
  }

  if (schema.hasDirection && schema.hasMessageType) {
    const result = await run(
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
    return result?.lastID;
  }

  if (schema.hasDirection) {
    const result = await run(
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
    return result?.lastID;
  }

  const result = await run(
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
  return result?.lastID;
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

async function updateConversation({ id, name, lastMessage, updatedAt }) {
  const finalUpdatedAt = updatedAt || new Date().toISOString();
  await run(
    `
    UPDATE conversations
    SET name = COALESCE(?, name),
        last_message = ?,
        updated_at = ?
    WHERE id = ?
    `,
    [name || null, lastMessage || null, finalUpdatedAt, id]
  );
}

async function updateConversationIncoming({ id, name, lastMessage, updatedAt }) {
  const finalUpdatedAt = updatedAt || new Date().toISOString();
  await run(
    `
    UPDATE conversations
    SET name = COALESCE(?, name),
        last_message = ?,
        updated_at = ?,
        unread_count = COALESCE(unread_count, 0) + 1
    WHERE id = ?
    `,
    [name || null, lastMessage || null, finalUpdatedAt, id]
  );
}

async function saveAiLog({ conversationId, prompt, response }) {
  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    log("warn", "ai_log_skipped_empty_prompt", { conversationId });
    return;
  }
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
    const rawContactId = message.fromMe ? message.to : message.from;
    if (
      rawContactId === "status@broadcast" ||
      rawContactId?.includes("@newsletter") ||
      rawContactId?.includes("@g.us")
    ) {
      log("info", "skip_broadcast_message", { contactId: rawContactId });
      return;
    }
    const normalizedContactId = normalizeContactId(rawContactId);
    const contactId = normalizedContactId || rawContactId;
    const contact = await message.getContact();
    const contactName = contact?.pushname || contact?.name || contactId;

    log("info", "incoming_message_raw", {
      from: rawContactId,
      to: message?.to,
      id: message?.id?._serialized || message?.id?.id || null,
      type: message?.type,
      hasMedia: Boolean(message?.hasMedia),
      contactId,
    });

    const existing = await findConversationByContactId(rawContactId, normalizedContactId);
    const conversation = existing || (await ensureConversation(contactId, contactName));
    await ensureContact(conversation?.contact_id || contactId);
    const now = Date.now();
    const messageId = message?.id?.id || message?.id?._serialized;
    const fallbackKey = `${conversation?.contact_id || contactId}:${message?.body || ""}:${message?.timestamp || ""}`;
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
    const timestamp = getMessageTimestampIso(message);

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
    const mediaPreview = media ? getMediaPreviewLabel(media.mediaType) : null;
    const lastMessageText = message.body || mediaPreview || "";
    const bodyToStore = message.body || mediaPreview || "[media]";

    const savedId = await saveMessage({
      conversationId: conversation.id,
      fromMe: false,
      body: bodyToStore,
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
      updatedAt: timestamp,
    });
    const snapshot = await getConversationSnapshot(conversation.id);
    sendEvent("message_received", {
      conversationId: conversation.id,
      contactId: conversation?.contact_id || normalizedContactId || rawContactId,
      message: {
        id: String(savedId || messageId || `${conversation.id}:${timestamp}`),
        conversationId: String(conversation.id),
        content: bodyToStore || "",
        sender: "contact",
        timestamp,
        messageType: "incoming",
        mediaType: media?.mediaType || null,
        mediaUrl: media?.mediaUrl || null,
        mimeType: media?.mimeType || null,
      },
      conversation: snapshot
        ? {
            id: String(snapshot.id),
            contactName: toDisplayName(snapshot),
            lastMessage: snapshot.last_message || lastMessageText,
            timestamp: snapshot.updated_at || timestamp,
            unread: snapshot.unread_count || 0,
            aiEnabled: Boolean(snapshot.ai_enabled ?? 1),
            resolvedAt: snapshot.resolved_at || null,
          }
        : undefined,
    });
    sendEvent("conversation_updated", { conversationId: conversation.id });

    const nowMs = Date.now();
    const messageTsMs = message.timestamp ? message.timestamp * 1000 : nowMs;
    const isNewMsg = message.isNewMsg !== false;
    const isRecent = nowMs - messageTsMs < 2 * 60 * 1000;
    const shouldAutomate = isNewMsg && isRecent;
    if (!shouldAutomate) {
      log("info", "skip_automation_for_history", {
        contactId,
        conversationId: conversation.id,
        isNewMsg,
        messageTs: message.timestamp || null,
      });
      return;
    }

    await scheduleFollowups({ contactId, conversationId: conversation.id });

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
      const sentMessage = await client.sendMessage(contactId, body);
      registerOutgoingMessageId(sentMessage);
      const outTimestamp = getMessageTimestampIso(sentMessage);
      const savedId = await saveMessage({
        conversationId: conversation.id,
        fromMe: true,
        body,
        timestamp: outTimestamp,
        messageType: "ai",
      });
      await updateConversation({
        id: conversation.id,
        name: contactName,
        lastMessage: body,
        updatedAt: outTimestamp,
      });
      const snapshot = await getConversationSnapshot(conversation.id);
      sendEvent("message_sent", {
        conversationId: conversation.id,
        message: {
          id: String(savedId || sentMessage?.id?._serialized || `${conversation.id}:${outTimestamp}`),
          conversationId: String(conversation.id),
          content: body,
          sender: "ai",
          timestamp: outTimestamp,
          messageType: "ai",
          mediaType: null,
          mediaUrl: null,
          mimeType: null,
        },
        conversation: snapshot
          ? {
              id: String(snapshot.id),
              contactName: toDisplayName(snapshot),
              lastMessage: snapshot.last_message || body,
              timestamp: snapshot.updated_at || outTimestamp,
              unread: snapshot.unread_count || 0,
              aiEnabled: Boolean(snapshot.ai_enabled ?? 1),
              resolvedAt: snapshot.resolved_at || null,
            }
          : undefined,
      });
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

function resolveOutgoingContactId(message) {
  return message?.to || message?.id?.remote || null;
}

function registerOutgoingMessageId(message) {
  const messageId = message?.id?.id || message?.id?._serialized;
  if (!messageId) return;
  processedMessageIds.set(`out:id:${messageId}`, Date.now());
}

async function getConversationSnapshot(conversationId) {
  return get(
    `
    SELECT id, name, contact_name, contact_id, last_message, updated_at, unread_count, ai_enabled, resolved_at
    FROM conversations
    WHERE id = ?
    LIMIT 1
    `,
    [conversationId]
  );
}

function toDisplayName(snapshot) {
  const raw =
    snapshot?.name ||
    snapshot?.contact_name ||
    snapshot?.contact_id ||
    "";
  return raw.replace(/@c\.us$/i, "").replace(/@g\.us$/i, "") || snapshot?.contact_id || "";
}

async function handleOutgoingMessage(message) {
  try {
    if (!message?.fromMe) return;
    const rawContactId = resolveOutgoingContactId(message);
    if (!rawContactId) return;
    if (
      rawContactId === "status@broadcast" ||
      rawContactId?.includes("@newsletter") ||
      rawContactId?.includes("@g.us")
    ) {
      return;
    }

    const now = Date.now();
    const messageId = message?.id?.id || message?.id?._serialized;
    const fallbackKey = `${rawContactId}:${message?.body || ""}:${message?.timestamp || ""}:out`;
    const dedupeKey = messageId ? `out:id:${messageId}` : `out:fallback:${fallbackKey}`;
    const last = processedMessageIds.get(dedupeKey) || processedMessageKeys.get(dedupeKey);
    if (last && now - last < 5 * 60 * 1000) {
      log("info", "duplicate_outgoing_skipped", { messageId, contactId: rawContactId, dedupeKey });
      return;
    }
    if (messageId) {
      processedMessageIds.set(dedupeKey, now);
    } else {
      processedMessageKeys.set(dedupeKey, now);
    }

    const normalizedContactId = normalizeContactId(rawContactId);
    const chat = await message.getChat().catch(() => null);
    const contactName = chat?.name || chat?.id?.user || normalizedContactId || rawContactId;
    const existingConversation = await findConversationByContactId(rawContactId, normalizedContactId);
    const conversation = existingConversation || (await ensureConversation(normalizedContactId || rawContactId, contactName));
    await ensureContact(conversation?.contact_id || normalizedContactId || rawContactId);

    const timestamp = getMessageTimestampIso(message);
    const mediaType = message?.hasMedia ? message?.type || "media" : null;
    const mediaPreview = mediaType ? getMediaPreviewLabel(mediaType) : null;
    const bodyToStore = message.body || mediaPreview || "[media]";

    const existingMessage = await get(
      `
      SELECT id
      FROM messages
      WHERE conversation_id = ?
        AND COALESCE(from_me, 0) = 1
        AND body = ?
        AND ABS(strftime('%s', COALESCE(timestamp, created_at)) - strftime('%s', ?)) < 30
      ORDER BY id DESC
      LIMIT 1
      `,
      [conversation.id, bodyToStore, timestamp]
    );
    if (existingMessage?.id) {
      log("info", "outgoing_message_already_persisted", { conversationId: conversation.id });
      return;
    }

    const savedId = await saveMessage({
      conversationId: conversation.id,
      fromMe: true,
      body: bodyToStore,
      timestamp,
      messageType: "manual",
      mediaType,
      mediaUrl: null,
      mimeType: null,
    });
    await updateConversation({
      id: conversation.id,
      name: contactName,
      lastMessage: bodyToStore,
      updatedAt: timestamp,
    });
    const snapshot = await getConversationSnapshot(conversation.id);
    sendEvent("message_sent", {
      conversationId: conversation.id,
      message: {
        id: String(savedId || messageId || `${conversation.id}:${timestamp}`),
        conversationId: String(conversation.id),
        content: bodyToStore,
        sender: "user",
        timestamp,
        messageType: "manual",
        mediaType,
        mediaUrl: null,
        mimeType: null,
      },
      conversation: snapshot
        ? {
            id: String(snapshot.id),
            contactName: toDisplayName(snapshot),
            lastMessage: snapshot.last_message || bodyToStore,
            timestamp: snapshot.updated_at || timestamp,
            unread: snapshot.unread_count || 0,
            aiEnabled: Boolean(snapshot.ai_enabled ?? 1),
            resolvedAt: snapshot.resolved_at || null,
          }
        : undefined,
    });
    sendEvent("conversation_updated", { conversationId: conversation.id });
  } catch (error) {
    log("error", "outgoing_message_handling_failed", { error: error?.message });
  }
}

async function initWhatsappClient() {
  blockWatchdog(90 * 1000, "init");
  client = new Client({
    authStrategy: new LocalAuth({
      clientId: env.WHATSAPP_CLIENT_ID,
      dataPath: "/var/www/.wwebjs_auth",
    }),
    puppeteer: {
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-first-run",
        "--no-zygote",
        "--single-process"
      ]
    },
  });

  client.on("qr", (qr) => {
    latestQr = qr;
    connectionStatus = "not_authenticated";
    lastQrAt = Date.now();
    blockWatchdog(2 * 60 * 1000, "qr");
    log("info", "whatsapp_qr_received", { status: connectionStatus });
    sendEvent("qr", { qr });
    qrcode.generate(qr, { small: true });
  });

  client.on("ready", () => {
    connectionStatus = "ready";
    lastReadyAt = Date.now();
    blockWatchdog(2 * 60 * 1000, "ready");
    log("info", "whatsapp_ready", { status: connectionStatus });
    console.info("[WHATSAPP] Client ready");
    sendEvent("ready", { status: "ready" });
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
    lastAuthAt = Date.now();
    blockWatchdog(2 * 60 * 1000, "authenticated");
    log("info", "whatsapp_authenticated", { status: connectionStatus });
    sendEvent("ready", { status: "authenticated" });
  });

  client.on("auth_failure", (msg) => {
    connectionStatus = "not_authenticated";
    blockWatchdog(2 * 60 * 1000, "auth_failure");
    log("error", "whatsapp_auth_failure", { message: msg, status: connectionStatus });
  });

  client.on("disconnected", (reason) => {
    connectionStatus = "disconnected";
    lastDisconnectedAt = Date.now();
    blockWatchdog(30 * 1000, "disconnected");
    log("warn", "whatsapp_disconnected", { reason, status: connectionStatus });
    console.warn("[WHATSAPP] Client disconnected", { reason });
    sendEvent("disconnected", { status: "disconnected", reason });
  });

  client.on("change_state", (state) => {
    lastStateChangeAt = Date.now();
    blockWatchdog(60 * 1000, "change_state");
    log("info", "whatsapp_change_state", { state });
  });

  client.on("message", handleIncomingMessage);
  client.on("message_create", handleOutgoingMessage);

  await client.initialize();
  startWatchdog();
}

function startWatchdog() {
  if (watchdogTimer) return;
  watchdogTimer = setInterval(async () => {
    console.info("[WATCHDOG] Checking system health");
    const now = Date.now();
    if (connectionStatus === "ready" || connectionStatus === "authenticated") {
      return;
    }
    if (restarting) return;
    if (now < watchdogBlockUntil) {
      log("info", "watchdog_hold", { until: new Date(watchdogBlockUntil).toISOString() });
      return;
    }
    if (now < transientErrorUntil) {
      log("warn", "watchdog_transient_hold", { until: new Date(transientErrorUntil).toISOString() });
      return;
    }
    if (lastStateChangeAt && now - lastStateChangeAt < 60 * 1000) {
      log("info", "watchdog_waiting_for_state_transition");
      return;
    }
    if (connectionStatus === "not_authenticated" && latestQr && lastQrAt && now - lastQrAt < 5 * 60 * 1000) {
      log("info", "watchdog_waiting_for_auth", { lastQrAt: new Date(lastQrAt).toISOString() });
      return;
    }
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
      const message = error?.message || "";
      if (message.includes("Execution context was destroyed")) {
        transientErrorUntil = now + 2 * 60 * 1000;
        log("warn", "whatsapp_watchdog_transient_error", {
          error: message,
          hold_until: new Date(transientErrorUntil).toISOString(),
        });
      } else {
        log("error", "whatsapp_watchdog_failed", { error: message });
      }
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
  const normalizedTo = normalizeContactId(to);
  const existing = await findConversationByContactId(to, normalizedTo);
  const convo = existing || (await ensureConversation(normalizedTo || to, to));
  await ensureContact(convo?.contact_id || normalizedTo || to);
  const sentMessage = await client.sendMessage(convo?.contact_id || normalizedTo || to, body);
  registerOutgoingMessageId(sentMessage);
  const outTimestamp = getMessageTimestampIso(sentMessage);
  const savedId = await saveMessage({
    conversationId: convo.id,
    fromMe: true,
    body,
    timestamp: outTimestamp,
    messageType: "manual",
  });
  await updateConversation({
    id: convo.id,
    name: convo.name || to,
    lastMessage: body,
    updatedAt: outTimestamp,
  });
  const snapshot = await getConversationSnapshot(convo.id);
  sendEvent("message_sent", {
    conversationId: convo.id,
    message: {
      id: String(savedId || sentMessage?.id?._serialized || `${convo.id}:${outTimestamp}`),
      conversationId: String(convo.id),
      content: body,
      sender: "user",
      timestamp: outTimestamp,
      messageType: "manual",
      mediaType: null,
      mediaUrl: null,
      mimeType: null,
    },
    conversation: snapshot
      ? {
          id: String(snapshot.id),
          contactName: toDisplayName(snapshot),
          lastMessage: snapshot.last_message || body,
          timestamp: snapshot.updated_at || outTimestamp,
          unread: snapshot.unread_count || 0,
          aiEnabled: Boolean(snapshot.ai_enabled ?? 1),
          resolvedAt: snapshot.resolved_at || null,
        }
      : undefined,
  });
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

