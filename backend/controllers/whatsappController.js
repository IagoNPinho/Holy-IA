// WhatsApp connection helpers for the frontend.
const {
  getLatestQr,
  getStatus: getWhatsappStatus,
  getWhatsappClient,
  disconnect,
  syncInitialChats,
} = require("../services/whatsappService");
const { getConversationCount } = require("../database/db");

async function getQr(_req, res) {
  const qr = getLatestQr();
  if (!qr) {
    return res.status(404).json({ error: "QR ainda não disponivel." });
  }
  return res.json({ qr });
}

async function getStatus(_req, res) {
  return res.json({ status: getWhatsappStatus() });
}

async function postDisconnect(_req, res, next) {
  try {
    const result = await disconnect();
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

async function syncChats(_req, res, next) {
  try {
    const status = getWhatsappStatus();
    if (status !== "ready" && status !== "authenticated") {
      return res.status(400).json({ error: "WhatsApp not connected." });
    }
    const client = getWhatsappClient();
    if (!client) {
      return res.status(400).json({ error: "WhatsApp client not initialized." });
    }
    const result = await syncInitialChats(client);
    const total = await getConversationCount();
    console.info("whatsapp_sync_result", {
      chats_found: result.chatsFound,
      chats_saved: result.chatsSaved,
      total_in_db: total,
    });
    return res.json({
      synced_chats: result.chatsSaved,
      total_in_db_after_sync: total,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getQr,
  getStatus,
  postDisconnect,
  syncChats,
};
