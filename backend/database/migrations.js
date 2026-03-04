// Database schema migrations.
const { run, all } = require("./db");

async function ensureColumns(table, columns) {
  const info = await all(`PRAGMA table_info(${table})`);
  const existing = new Set(info.map((col) => col.name));
  for (const [name, definition] of Object.entries(columns)) {
    if (!existing.has(name)) {
      await run(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
    }
  }
}

async function migrate() {
  await run(`
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_id TEXT NOT NULL UNIQUE,
      name TEXT,
      last_message TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await ensureColumns("conversations", {
    name: "TEXT",
    last_message: "TEXT",
    updated_at: "TEXT",
    ai_enabled: "INTEGER NOT NULL DEFAULT 1",
    unread_count: "INTEGER NOT NULL DEFAULT 0",
    contact_name: "TEXT",
    created_at: "TEXT",
  });

  await run(`
    UPDATE conversations
    SET name = COALESCE(name, contact_name, contact_id)
    WHERE name IS NULL
  `);
  await run(`
    UPDATE conversations
    SET ai_enabled = COALESCE(ai_enabled, 1)
    WHERE ai_enabled IS NULL
  `);
  await run(`
    UPDATE conversations
    SET unread_count = COALESCE(unread_count, 0)
    WHERE unread_count IS NULL
  `);
  await run(`
    UPDATE conversations
    SET updated_at = COALESCE(updated_at, datetime('now'))
    WHERE updated_at IS NULL OR updated_at = ''
  `);
  await run(`
    UPDATE conversations
    SET created_at = COALESCE(created_at, datetime('now'))
    WHERE created_at IS NULL OR created_at = ''
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      from_me INTEGER NOT NULL DEFAULT 0,
      body TEXT NOT NULL,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    )
  `);

  await ensureColumns("messages", {
    from_me: "INTEGER NOT NULL DEFAULT 0",
    body: "TEXT",
    timestamp: "TEXT",
    direction: "TEXT",
    created_at: "TEXT",
    message_type: "TEXT DEFAULT 'incoming'",
  });

  const messageColumns = await all(`PRAGMA table_info(messages)`);
  const hasDirection = messageColumns.some((col) => col.name === "direction");
  const hasCreatedAt = messageColumns.some((col) => col.name === "created_at");

  if (hasDirection) {
    await run(`
      UPDATE messages
      SET from_me = CASE WHEN direction = 'out' THEN 1 ELSE 0 END
      WHERE from_me IS NULL
    `);
  }

  if (hasCreatedAt) {
    await run(`
      UPDATE messages
      SET timestamp = COALESCE(timestamp, created_at)
      WHERE timestamp IS NULL OR timestamp = ''
    `);
  }
  await run(`
    UPDATE messages
    SET timestamp = COALESCE(timestamp, datetime('now'))
    WHERE timestamp IS NULL OR timestamp = ''
  `);

  await run(`CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp)`);
  await run(
    `CREATE INDEX IF NOT EXISTS idx_messages_conversation_timestamp ON messages(conversation_id, timestamp DESC)`
  );

  await run(`
    CREATE TABLE IF NOT EXISTS clinic_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      ai_enabled INTEGER NOT NULL DEFAULT 1,
      clinic_name TEXT,
      voice_tone TEXT,
      procedures TEXT,
      working_hours TEXT,
      confirmation_message TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await ensureColumns("clinic_settings", {
    ai_enabled: "INTEGER NOT NULL DEFAULT 1",
    ai_enabled_global: "INTEGER NOT NULL DEFAULT 1",
    clinic_name: "TEXT",
    tone: "TEXT",
    voice_tone: "TEXT",
    procedures: "TEXT",
    working_hours: "TEXT",
    confirmation_message: "TEXT",
    updated_at: "TEXT",
  });

  await run(`
    INSERT OR IGNORE INTO clinic_settings
      (id, ai_enabled, ai_enabled_global, clinic_name, tone, voice_tone, procedures, working_hours, confirmation_message)
    VALUES
      (1, 1, 1, '', 'professional', 'professional', '', '', '')
  `);
  await run(`
    UPDATE clinic_settings
    SET tone = COALESCE(tone, voice_tone, 'professional')
    WHERE tone IS NULL OR tone = ''
  `);
  await run(`
    UPDATE clinic_settings
    SET ai_enabled_global = COALESCE(ai_enabled_global, ai_enabled, 1)
    WHERE ai_enabled_global IS NULL
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS ai_blocklist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_id TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  await run(`
    UPDATE clinic_settings
    SET updated_at = COALESCE(updated_at, datetime('now'))
    WHERE updated_at IS NULL OR updated_at = ''
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS ai_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER,
      prompt TEXT NOT NULL,
      response TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    )
  `);

  await run(`CREATE INDEX IF NOT EXISTS idx_ai_logs_conversation_id ON ai_logs(conversation_id)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_ai_logs_created_at ON ai_logs(created_at)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC)`);
}

module.exports = { migrate };
