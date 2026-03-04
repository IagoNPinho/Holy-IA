const { all, get } = require("../database/db");

async function getMetrics(_req, res, next) {
  try {
    const today = await get(
      `
      SELECT date('now') as today
      `
    );
    const day = today?.today;

    const messagesTodayRow = await get(
      `
      SELECT COUNT(*) as total
      FROM messages
      WHERE date(COALESCE(timestamp, created_at)) = ?
      `,
      [day]
    );

    const aiMessagesRow = await get(
      `
      SELECT COUNT(*) as total
      FROM ai_logs
      WHERE date(created_at) = ?
      `,
      [day]
    );

    const manualMessagesRow = await get(
      `
      SELECT COUNT(*) as total
      FROM messages
      WHERE from_me = 1 AND date(COALESCE(timestamp, created_at)) = ?
      `,
      [day]
    );

    const activeConversationsRow = await get(
      `
      SELECT COUNT(DISTINCT conversation_id) as total
      FROM messages
      WHERE date(COALESCE(timestamp, created_at)) = ?
      `,
      [day]
    );

    res.json({
      messages_today: messagesTodayRow?.total || 0,
      ai_messages: aiMessagesRow?.total || 0,
      manual_messages: manualMessagesRow?.total || 0,
      active_conversations: activeConversationsRow?.total || 0,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getMetrics };
