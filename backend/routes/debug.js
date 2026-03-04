const express = require("express");
const { debugConversations } = require("../controllers/debugController");

const router = express.Router();

router.get("/debug/conversations", debugConversations);

module.exports = { debugRouter: router };
