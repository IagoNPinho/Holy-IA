const express = require("express");
const { getQr, getStatus, postDisconnect } = require("../controllers/whatsappController");

const router = express.Router();

router.get("/whatsapp/qr", getQr);
router.get("/whatsapp/status", getStatus);
router.post("/whatsapp/disconnect", postDisconnect);

module.exports = { whatsappRouter: router };
