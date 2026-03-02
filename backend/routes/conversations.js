const express = require("express");
const { listConversations, listMessages, sendManual } = require("../controllers/conversationController");

const router = express.Router();

router.get("/conversations", listConversations);
router.get("/messages/:conversationId", listMessages);
router.post("/messages/send", sendManual);

module.exports = { conversationsRouter: router };
