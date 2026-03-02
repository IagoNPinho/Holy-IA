// Database schema migrations.
const { run } = require("./db");

async function migrate() {
  await run(`
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_id TEXT NOT NULL UNIQUE,
      contact_name TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      direction TEXT NOT NULL,
      body TEXT NOT NULL,
      message_id TEXT,
      from_number TEXT,
      to_number TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    )
  `);

  await run(`CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at)`);

  await run(`
    CREATE TABLE IF NOT EXISTS clinic_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      clinic_name TEXT,
      voice_tone TEXT,
      procedures TEXT,
      working_hours TEXT,
      confirmation_message TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await run(`
    INSERT OR IGNORE INTO clinic_settings
      (id, clinic_name, voice_tone, procedures, working_hours, confirmation_message)
    VALUES
      (1, '', 'professional', '', '', '')
  `);
}

module.exports = { migrate };
