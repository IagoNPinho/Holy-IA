const express = require("express");
const { getAiStatus } = require("../controllers/aiController");

const router = express.Router();

router.get("/ai/status", getAiStatus);

module.exports = { aiRouter: router };
