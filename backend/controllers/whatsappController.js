// WhatsApp connection helpers for the frontend.
const { getLatestQr, getConnectionStatus } = require("../services/whatsappService");

async function getQr(_req, res) {
  const qr = getLatestQr();
  if (!qr) {
    return res.status(404).json({ error: "QR ainda não disponivel." });
  }
  return res.json({ qr });
}

async function getStatus(_req, res) {
  return res.json({ status: getConnectionStatus() });
}

module.exports = {
  getQr,
  getStatus,
};
