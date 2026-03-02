const express = require("express");
const { toggleAi } = require("../controllers/settingsController");

const router = express.Router();

router.post("/toggle-ia", toggleAi);

module.exports = { toggleRouter: router };
