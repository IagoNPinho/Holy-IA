const { all, getConversationCount } = require("../database/db");

async function debugConversations(req, res, next) {
  try {
    const limit = Math.min(Number.parseInt(req.query.limit, 10) || 20, 100);
    const offset = Math.max(Number.parseInt(req.query.offset, 10) || 0, 0);
    const total = await getConversationCount();
    const example = await all(
      `
      SELECT id, name, last_message, updated_at
      FROM conversations
      ORDER BY updated_at DESC
      LIMIT 10
      `
    );
    res.json({
      total_conversations_in_db: total,
      example_first_10_conversations: example,
      limit_received: limit,
      offset_received: offset,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { debugConversations };
