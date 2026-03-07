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

    const leadsTodayRow = await get(
      `
      SELECT COUNT(*) as total
      FROM contacts
      WHERE date(first_seen_at) = ?
      `,
      [day]
    );

    const mediaMessagesRow = await get(
      `
      SELECT COUNT(*) as total
      FROM messages
      WHERE COALESCE(from_me, 0) = 0 AND media_type IS NOT NULL AND date(COALESCE(timestamp, created_at)) = ?
      `,
      [day]
    );

    const avgResponseRow = await get(
      `
      WITH inbound AS (
        SELECT
          conversation_id,
          COALESCE(timestamp, created_at) AS ts
        FROM messages
        WHERE COALESCE(from_me, 0) = 0
          AND date(COALESCE(timestamp, created_at)) = ?
      ),
      outbound AS (
        SELECT
          conversation_id,
          COALESCE(timestamp, created_at) AS ts
        FROM messages
        WHERE COALESCE(from_me, 0) = 1
      ),
      matched AS (
        SELECT
          i.ts AS inbound_ts,
          (
            SELECT MIN(o.ts)
            FROM outbound o
            WHERE o.conversation_id = i.conversation_id
              AND o.ts > i.ts
          ) AS outbound_ts
        FROM inbound i
      )
      SELECT AVG((julianday(outbound_ts) - julianday(inbound_ts)) * 86400.0) AS avg_seconds
      FROM matched
      WHERE outbound_ts IS NOT NULL
      `,
      [day]
    );

    const aiOutRow = await get(
      `
      SELECT COUNT(*) as total
      FROM messages
      WHERE COALESCE(from_me, 0) = 1 AND message_type = 'ai' AND date(COALESCE(timestamp, created_at)) = ?
      `,
      [day]
    );

    const manualOutRow = await get(
      `
      SELECT COUNT(*) as total
      FROM messages
      WHERE COALESCE(from_me, 0) = 1 AND message_type = 'manual' AND date(COALESCE(timestamp, created_at)) = ?
      `,
      [day]
    );

    res.json({
      messages_today: messagesTodayRow?.total || 0,
      ai_messages: aiMessagesRow?.total || 0,
      manual_messages: manualMessagesRow?.total || 0,
      active_conversations: activeConversationsRow?.total || 0,
      leads_today: leadsTodayRow?.total || 0,
      avg_response_time_seconds: avgResponseRow?.avg_seconds
        ? Number(avgResponseRow.avg_seconds.toFixed(1))
        : 0,
      ai_vs_manual_ratio:
        manualOutRow?.total || aiOutRow?.total
          ? (aiOutRow?.total || 0) / Math.max(1, (manualOutRow?.total || 0))
          : 0,
      media_messages_today: mediaMessagesRow?.total || 0,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getMetrics };
