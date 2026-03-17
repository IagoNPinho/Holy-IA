const { get, all, run } = require("../database/db");

function normalizePhone(phone) {
  if (!phone) return phone;
  const digits = String(phone).replace(/[^\d]/g, "");
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function normalizeExternalTimestamp(raw) {
  if (!raw) return new Date().toISOString();
  if (typeof raw === "number") {
    const ms = raw < 1000000000000 ? raw * 1000 : raw;
    return new Date(ms).toISOString();
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
}

async function upsertContact({ phone, name }) {
  const normalized = normalizePhone(phone);
  const existing = await get("SELECT id, name FROM contacts_lite WHERE phone = ?", [normalized]);
  if (existing) {
    if (name && name !== existing.name) {
      await run(
        "UPDATE contacts_lite SET name = ?, updated_at = datetime('now') WHERE id = ?",
        [name, existing.id]
      );
    }
    return existing.id;
  }
  const result = await run(
    "INSERT INTO contacts_lite (phone, name) VALUES (?, ?)",
    [normalized, name || null]
  );
  return result?.lastID;
}

async function upsertConversation({ externalChatId, contactId, instanceId, channel }) {
  const existing = await get(
    "SELECT id, ai_enabled FROM conversations_lite WHERE external_chat_id = ? LIMIT 1",
    [externalChatId]
  );
  if (existing) return existing.id;
  const result = await run(
    `
    INSERT INTO conversations_lite (external_chat_id, contact_id, instance_id, channel, status, ai_enabled, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'new', 1, datetime('now'), datetime('now'))
    `,
    [externalChatId, contactId, instanceId || null, channel || "whatsapp"]
  );
  return result?.lastID;
}

async function persistInboundMessage({
  conversationId,
  contactId,
  externalMessageId,
  text,
  messageType,
  externalTimestamp,
}) {
  const existing = externalMessageId
    ? await get("SELECT id FROM messages_lite WHERE external_message_id = ?", [externalMessageId])
    : null;
  if (existing) return existing.id;
  const result = await run(
    `
    INSERT INTO messages_lite
      (external_message_id, conversation_id, contact_id, direction, sender_type, message_type, text_content, status, external_timestamp, created_at, updated_at)
    VALUES
      (?, ?, ?, 'inbound', 'customer', ?, ?, 'received', ?, datetime('now'), datetime('now'))
    `,
    [
      externalMessageId || null,
      conversationId,
      contactId,
      messageType || "text",
      text || "",
      externalTimestamp || new Date().toISOString(),
    ]
  );
  await run(
    `
    UPDATE conversations_lite
    SET last_message_preview = ?, last_message_at = ?, unread_count = unread_count + 1, updated_at = datetime('now')
    WHERE id = ?
    `,
    [text || "", externalTimestamp || new Date().toISOString(), conversationId]
  );
  return result?.lastID;
}

async function persistOutboundMessage({
  conversationId,
  contactId,
  externalMessageId,
  text,
  messageType,
  status,
  externalTimestamp = new Date().toISOString(),
}) {
  const existing = externalMessageId
    ? await get("SELECT id FROM messages_lite WHERE external_message_id = ?", [externalMessageId])
    : null;
  if (existing) return existing.id;
  const result = await run(
    `
    INSERT INTO messages_lite
      (
        external_message_id,
        conversation_id,
        contact_id,
        direction,
        sender_type,
        message_type,
        text_content,
        status,
        external_timestamp,
        created_at,
        updated_at
      )
    VALUES
      (?, ?, ?, 'outbound', 'human', ?, ?, ?, ?, datetime('now'), datetime('now'))
    `,
    [
      externalMessageId || null,
      conversationId,
      contactId || null,
      messageType || "text",
      text || "",
      status || "queued",
      externalTimestamp,
    ]
  );
  await run(
    `
    UPDATE conversations_lite
    SET last_message_preview = ?, last_message_at = ?, unread_count = 0, updated_at = datetime('now')
    WHERE id = ?
    `,
    [text || "", externalTimestamp, conversationId]
  );
  return result?.lastID;
}

async function syncMessagesFromProvider({ conversationId, contactId, messages }) {
  let inserted = 0;
  let deduped = 0;
  let newest = null;

  for (const message of messages || []) {
    const externalMessageId = message?.externalMessageId || null;
    const text = message?.text || "";
    const messageType = message?.messageType || "text";
    const fromMe = Boolean(message?.fromMe);
    const externalTimestamp = normalizeExternalTimestamp(message?.timestamp);

    if (externalMessageId) {
      const existing = await get(
        "SELECT id FROM messages_lite WHERE external_message_id = ? LIMIT 1",
        [externalMessageId]
      );
      if (existing?.id) {
        deduped += 1;
        continue;
      }
    } else {
      const fallbackExisting = await get(
        `
        SELECT id
        FROM messages_lite
        WHERE conversation_id = ?
          AND text_content = ?
          AND ABS(strftime('%s', COALESCE(external_timestamp, created_at)) - strftime('%s', ?)) < 30
        LIMIT 1
        `,
        [conversationId, text, externalTimestamp]
      );
      if (fallbackExisting?.id) {
        deduped += 1;
        continue;
      }
    }

    await run(
      `
      INSERT INTO messages_lite
        (
          external_message_id,
          conversation_id,
          contact_id,
          direction,
          sender_type,
          message_type,
          text_content,
          status,
          external_timestamp,
          created_at,
          updated_at
        )
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `,
      [
        externalMessageId,
        conversationId,
        contactId,
        fromMe ? "outbound" : "inbound",
        fromMe ? "human" : "customer",
        messageType || "text",
        text || "",
        fromMe ? "sent" : "received",
        externalTimestamp,
      ]
    );

    inserted += 1;
    if (!newest || externalTimestamp > newest.timestamp) {
      newest = { timestamp: externalTimestamp, text: text || "" };
    }
  }

  if (newest) {
    await run(
      `
      UPDATE conversations_lite
      SET
        last_message_preview = CASE
          WHEN last_message_at IS NULL OR last_message_at < ? THEN ?
          ELSE last_message_preview
        END,
        last_message_at = CASE
          WHEN last_message_at IS NULL OR last_message_at < ? THEN ?
          ELSE last_message_at
        END,
        updated_at = datetime('now')
      WHERE id = ?
      `,
      [newest.timestamp, newest.text, newest.timestamp, newest.timestamp, conversationId]
    );
  }

  return { inserted, deduped };
}

async function setOutboundProviderMessageId(messageId, externalMessageId, status) {
  if (!messageId || !externalMessageId) return null;
  return run(
    `
    UPDATE messages_lite
    SET external_message_id = ?, status = COALESCE(?, status), updated_at = datetime('now')
    WHERE id = ?
    `,
    [externalMessageId, status || null, messageId]
  );
}

async function listConversations(limit = 50, offset = 0) {
  return all(
    `
    SELECT
      c.id,
      c.external_chat_id,
      c.contact_id,
      c.status,
      c.ai_enabled,
      c.last_message_at,
      c.last_message_preview,
      c.unread_count,
      co.name as contact_name,
      co.phone as contact_phone
    FROM conversations_lite c
    JOIN contacts_lite co ON co.id = c.contact_id
    ORDER BY COALESCE(c.last_message_at, c.updated_at) DESC
    LIMIT ? OFFSET ?
    `,
    [limit, offset]
  );
}

async function listMessages(conversationId, limit = 100) {
  return all(
    `
    SELECT
      id,
      external_message_id,
      conversation_id,
      direction,
      sender_type,
      message_type,
      text_content,
      status,
      external_timestamp,
      created_at
    FROM messages_lite
    WHERE conversation_id = ?
    ORDER BY COALESCE(external_timestamp, created_at) DESC
    LIMIT ?
    `,
    [conversationId, limit]
  );
}

async function setAiEnabled(conversationId, enabled) {
  await run(
    `
    INSERT OR IGNORE INTO conversation_ai_state_lite (conversation_id, ai_enabled)
    VALUES (?, ?)
    `,
    [conversationId, enabled ? 1 : 0]
  );
  await run(
    `
    UPDATE conversation_ai_state_lite
    SET ai_enabled = ?, updated_at = datetime('now')
    WHERE conversation_id = ?
    `,
    [enabled ? 1 : 0, conversationId]
  );
  await run(
    `
    UPDATE conversations_lite
    SET ai_enabled = ?, updated_at = datetime('now')
    WHERE id = ?
    `,
    [enabled ? 1 : 0, conversationId]
  );
  return enabled ? 1 : 0;
}

async function updateOutboundStatus({ externalMessageId, status }) {
  if (!externalMessageId) return null;
  return run(
    `
    UPDATE messages_lite
    SET status = ?, updated_at = datetime('now')
    WHERE external_message_id = ?
    `,
    [status || "sent", externalMessageId]
  );
}

module.exports = {
  normalizePhone,
  upsertContact,
  upsertConversation,
  persistInboundMessage,
  persistOutboundMessage,
  listConversations,
  listMessages,
  setAiEnabled,
  updateOutboundStatus,
  setOutboundProviderMessageId,
  syncMessagesFromProvider,
};
