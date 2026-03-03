const { env } = require("../config/env");
const { get, run } = require("../database/db");

async function getAiEnabled() {
  const row = await get("SELECT ai_enabled FROM clinic_settings WHERE id = 1");
  if (row && row.ai_enabled !== null && row.ai_enabled !== undefined) {
    return Boolean(row.ai_enabled);
  }
  return Boolean(env.AI_DEFAULT_ENABLED);
}

async function setAiEnabled(enabled) {
  const value = enabled ? 1 : 0;
  await run(
    `
    INSERT OR IGNORE INTO clinic_settings
      (id, ai_enabled, clinic_name, voice_tone, procedures, working_hours, confirmation_message)
    VALUES
      (1, ?, '', 'professional', '', '', '')
    `,
    [value]
  );
  await run(
    `
    UPDATE clinic_settings
    SET ai_enabled = ?, updated_at = datetime('now')
    WHERE id = 1
    `,
    [value]
  );
  return Boolean(value);
}

module.exports = {
  getAiEnabled,
  setAiEnabled,
};
