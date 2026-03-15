const express = require("express");
const {
  inboundWebhook,
  outboundStatusWebhook,
  getConversations,
  getMessages,
  sendManual,
  toggleAi,
} = require("../controllers/inboxLiteController");
const { inboundLegacyWebhook } = require("../controllers/whatsappInboundBridgeController");

const publicRouter = express.Router();
publicRouter.post("/api/webhooks/whatsapp/inbound", inboundWebhook);
publicRouter.post("/api/webhooks/whatsapp/inbound-legacy", inboundLegacyWebhook);
publicRouter.post("/api/webhooks/whatsapp/outbound-status", outboundStatusWebhook);

const privateRouter = express.Router();
privateRouter.get("/api/conversations", getConversations);
privateRouter.get("/api/conversations/:id/messages", getMessages);
privateRouter.post("/api/conversations/:id/messages", sendManual);
privateRouter.post("/api/conversations/:id/ai-toggle", toggleAi);

module.exports = { inboxLitePublicRouter: publicRouter, inboxLitePrivateRouter: privateRouter };
