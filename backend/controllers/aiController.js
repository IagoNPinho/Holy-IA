const { getAiEnabled } = require("../services/settingsService");

async function getAiStatus(_req, res, next) {
  try {
    const enabled = await getAiEnabled();
    res.json({ enabled, status: enabled ? "enabled" : "disabled" });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAiStatus,
};
