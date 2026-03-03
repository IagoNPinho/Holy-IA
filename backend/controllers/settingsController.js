// Settings and automation endpoints.
const { addJob, removeJob, listJobs } = require("../state/systemState");
const { get, run } = require("../database/db");
const { getAiEnabled, setAiEnabled } = require("../services/settingsService");
const { sendBulk, scheduleSend } = require("../services/whatsappService");

async function getSettings(_req, res) {
  const row = await get(
    "SELECT clinic_name, voice_tone, procedures, working_hours, confirmation_message, ai_enabled FROM clinic_settings WHERE id = 1"
  );
  const aiEnabled = await getAiEnabled();
  res.json({
    aiEnabled,
    scheduledJobs: listJobs(),
    clinicSettings: {
      clinicName: row?.clinic_name || "",
      voiceTone: row?.voice_tone || "professional",
      procedures: row?.procedures || "",
      workingHours: row?.working_hours || "",
      confirmationMessage: row?.confirmation_message || "",
    },
  });
}

async function toggleAi(req, res) {
  const { enabled } = req.body || {};
  const newValue = await setAiEnabled(enabled);
  res.json({ aiEnabled: newValue });
}

async function bulkSend(req, res, next) {
  try {
    const { recipients, body, delayMs, confirmNonSpam } = req.body || {};

    if (!confirmNonSpam) {
      return res.status(400).json({ error: "Confirme que não é spam." });
    }

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: "Lista de destinatários obrigatória." });
    }

    if (!body || typeof body !== "string") {
      return res.status(400).json({ error: "Mensagem obrigatória." });
    }

    await sendBulk({ recipients, body, delayMs });
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
}

async function scheduleMessage(req, res, next) {
  try {
    const { id, to, body, sendAt, confirmNonSpam } = req.body || {};
    if (!confirmNonSpam) {
      return res.status(400).json({ error: "Confirme que não é spam." });
    }

    if (!to || typeof to !== "string") {
      return res.status(400).json({ error: "Destinatário obrigatório." });
    }

    if (!body || typeof body !== "string") {
      return res.status(400).json({ error: "Mensagem obrigatória." });
    }

    const when = new Date(sendAt);
    if (Number.isNaN(when.getTime())) {
      return res.status(400).json({ error: "sendAt inválido." });
    }

    const jobId = id || `job_${Date.now()}`;
    const timer = scheduleSend({
      id: jobId,
      to,
      body,
      sendAt: when,
      onScheduled: (err) => {
        if (err) return;
        removeJob(jobId);
      },
    });

    addJob(jobId, timer);
    return res.json({ ok: true, scheduledId: jobId });
  } catch (error) {
    return next(error);
  }
}

async function updateClinicSettings(req, res, next) {
  try {
    const { clinicName, voiceTone, procedures, workingHours, confirmationMessage } = req.body || {};
    await run(
      `
      UPDATE clinic_settings
      SET clinic_name = ?, voice_tone = ?, procedures = ?, working_hours = ?, confirmation_message = ?, updated_at = datetime('now')
      WHERE id = 1
      `,
      [
        clinicName || "",
        voiceTone || "professional",
        procedures || "",
        workingHours || "",
        confirmationMessage || "",
      ]
    );
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getSettings,
  toggleAi,
  bulkSend,
  scheduleMessage,
  updateClinicSettings,
};
