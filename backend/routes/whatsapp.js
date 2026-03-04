const express = require("express");
const { getQr, getStatus, postDisconnect, syncChats } = require("../controllers/whatsappController");

const router = express.Router();

router.get("/whatsapp/qr", getQr);
router.get("/whatsapp/status", getStatus);
router.post("/whatsapp/disconnect", postDisconnect);
router.post("/whatsapp/sync-chats", syncChats);

module.exports = { whatsappRouter: router };
