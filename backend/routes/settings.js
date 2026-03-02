const express = require("express");
const { getSettings, bulkSend, scheduleMessage, updateClinicSettings } = require("../controllers/settingsController");

const router = express.Router();

router.get("/settings", getSettings);
router.post("/bulk-send", bulkSend);
router.post("/schedule-send", scheduleMessage);
router.put("/clinic-settings", updateClinicSettings);

module.exports = { settingsRouter: router };
