// WhatsApp connection helpers for the frontend.
const { getLatestQr, getStatus: getWhatsappStatus, disconnect } = require("../services/whatsappService");

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

module.exports = {
  getQr,
  getStatus,
  postDisconnect,
};
