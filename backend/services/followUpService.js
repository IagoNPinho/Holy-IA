const { get, all, run } = require("../database/db");

const timers = new Map();

const FOLLOW_UPS = [
  {
    type: "10min",
    delayMs: 10 * 60 * 1000,
    message: "Posso te explicar melhor como funciona o procedimento 😊",
  },
  {
    type: "24h",
    delayMs: 24 * 60 * 60 * 1000,
    message: "Se quiser, posso verificar horários disponíveis esta semana.",
  },
];

function scheduleTimer(jobId, runAt) {
  const delay = Math.max(0, new Date(runAt).getTime() - Date.now());
  const timer = setTimeout(async () => {
    try {
      const job = await get(
        "SELECT id, contact_id, conversation_id, type, message, created_at, status FROM follow_up_jobs WHERE id = ?",
        [jobId]
      );
      if (!job || job.status !== "pending") return;

      const latestInbound = await get(
        `
        SELECT COALESCE(timestamp, created_at) as ts
        FROM messages m
        JOIN conversations c ON c.id = m.conversation_id
        WHERE c.contact_id = ? AND COALESCE(m.from_me, 0) = 0
        ORDER BY COALESCE(m.timestamp, m.created_at, m.id) DESC
        LIMIT 1
        `,
        [job.contact_id]
      );

      if (latestInbound?.ts && new Date(latestInbound.ts) > new Date(job.created_at)) {
        await run("UPDATE follow_up_jobs SET status = 'cancelled' WHERE id = ?", [jobId]);
        return;
      }

      const { sendManualMessage } = require("./whatsappService");
      await sendManualMessage({ to: job.contact_id, body: job.message, skipFollowup: true });
      await run(
        "UPDATE follow_up_jobs SET status = 'sent', sent_at = datetime('now') WHERE id = ?",
        [jobId]
      );
    } catch (error) {
      // Silently ignore; will be retried on next boot if still pending.
    } finally {
      timers.delete(jobId);
    }
  }, delay);

  timers.set(jobId, timer);
}

async function cancelPendingFollowups(contactId) {
  const jobs = await all(
    "SELECT id FROM follow_up_jobs WHERE contact_id = ? AND status = 'pending'",
    [contactId]
  );
  for (const job of jobs) {
    const timer = timers.get(job.id);
    if (timer) clearTimeout(timer);
    timers.delete(job.id);
  }
  await run("UPDATE follow_up_jobs SET status = 'cancelled' WHERE contact_id = ? AND status = 'pending'", [
    contactId,
  ]);
}

async function scheduleFollowups({ contactId, conversationId }) {
  await cancelPendingFollowups(contactId);
  for (const follow of FOLLOW_UPS) {
    const runAt = new Date(Date.now() + follow.delayMs).toISOString();
    const result = await run(
      `
      INSERT INTO follow_up_jobs (conversation_id, contact_id, type, message, run_at)
      VALUES (?, ?, ?, ?, ?)
      `,
      [conversationId, contactId, follow.type, follow.message, runAt]
    );
    if (result?.lastID) {
      scheduleTimer(result.lastID, runAt);
    }
  }
}

async function loadPendingFollowups() {
  const jobs = await all("SELECT id, run_at FROM follow_up_jobs WHERE status = 'pending'");
  for (const job of jobs) {
    scheduleTimer(job.id, job.run_at);
  }
}

module.exports = {
  scheduleFollowups,
  cancelPendingFollowups,
  loadPendingFollowups,
};
