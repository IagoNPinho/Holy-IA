const express = require("express");
const {
  listConversations,
  listMessages,
  sendManual,
  toggleConversationAi,
  resolveConversation,
} = require("../controllers/conversationController");

const router = express.Router();

router.get("/conversations", listConversations);
router.get("/messages/:conversationId", listMessages);
router.post("/messages/send", sendManual);
router.patch("/conversations/:conversationId/ai-toggle", toggleConversationAi);
router.patch("/conversations/:conversationId/resolve", resolveConversation);

module.exports = { conversationsRouter: router };
