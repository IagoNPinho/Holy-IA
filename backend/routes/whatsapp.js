const express = require("express");
const { getQr, getStatus } = require("../controllers/whatsappController");

const router = express.Router();

router.get("/whatsapp/qr", getQr);
router.get("/whatsapp/status", getStatus);

module.exports = { whatsappRouter: router };
