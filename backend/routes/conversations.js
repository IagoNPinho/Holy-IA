const express = require("express");
const {
  listConversations,
  listMessages,
  sendManual,
  toggleConversationAi,
} = require("../controllers/conversationController");

const router = express.Router();

router.get("/conversations", listConversations);
router.get("/messages/:conversationId", listMessages);
router.post("/messages/send", sendManual);
router.patch("/conversations/:conversationId/ai-toggle", toggleConversationAi);

module.exports = { conversationsRouter: router };
