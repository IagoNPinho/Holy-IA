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
    resolved_at: "TEXT",
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
    intent: "TEXT",
    media_type: "TEXT",
    media_url: "TEXT",
    mime_type: "TEXT",
    whatsapp_message_id: "TEXT",
    media_filename: "TEXT",
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
  await run(`CREATE INDEX IF NOT EXISTS idx_messages_intent ON messages(intent)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_messages_media_type ON messages(media_type)`);
  await run(`
    DELETE FROM messages
    WHERE whatsapp_message_id IS NOT NULL
      AND whatsapp_message_id != ''
      AND id NOT IN (
        SELECT MIN(id)
        FROM messages
        WHERE whatsapp_message_id IS NOT NULL
          AND whatsapp_message_id != ''
        GROUP BY whatsapp_message_id
      )
  `);
  await run(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_whatsapp_id ON messages(whatsapp_message_id)
     WHERE whatsapp_message_id IS NOT NULL AND whatsapp_message_id != ''`
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

  await ensureColumns("ai_logs", {
    contact_id: "TEXT",
    intent: "TEXT",
    provider: "TEXT",
    model: "TEXT",
    tokens: "INTEGER",
  });

  await run(`CREATE INDEX IF NOT EXISTS idx_ai_logs_conversation_id ON ai_logs(conversation_id)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_ai_logs_created_at ON ai_logs(created_at)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC)`);

  // Inbox Lite tables (isolated from legacy schema)
  await run(`
    CREATE TABLE IF NOT EXISTS contacts_lite (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL UNIQUE,
      name TEXT,
      avatar_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  await run(`CREATE INDEX IF NOT EXISTS idx_contacts_lite_phone ON contacts_lite(phone)`);

  await run(`
    CREATE TABLE IF NOT EXISTS conversations_lite (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_chat_id TEXT,
      contact_id INTEGER NOT NULL,
      instance_id TEXT,
      channel TEXT,
      status TEXT,
      ai_enabled INTEGER NOT NULL DEFAULT 1,
      last_message_at TEXT,
      last_message_preview TEXT,
      unread_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (contact_id) REFERENCES contacts_lite(id)
    )
  `);
  await run(`CREATE INDEX IF NOT EXISTS idx_conversations_lite_external_chat ON conversations_lite(external_chat_id)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_conversations_lite_contact ON conversations_lite(contact_id)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_conversations_lite_last_message_at ON conversations_lite(last_message_at DESC)`);

  await run(`
    CREATE TABLE IF NOT EXISTS messages_lite (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_message_id TEXT UNIQUE,
      conversation_id INTEGER NOT NULL,
      contact_id INTEGER,
      direction TEXT NOT NULL,
      sender_type TEXT,
      message_type TEXT,
      text_content TEXT,
      media_id INTEGER,
      status TEXT,
      external_timestamp TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES conversations_lite(id),
      FOREIGN KEY (contact_id) REFERENCES contacts_lite(id)
    )
  `);
  await run(`CREATE INDEX IF NOT EXISTS idx_messages_lite_conversation ON messages_lite(conversation_id, created_at)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_messages_lite_external_id ON messages_lite(external_message_id)`);

  await run(`
    CREATE TABLE IF NOT EXISTS media_assets_lite (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER,
      storage_provider TEXT,
      storage_path TEXT,
      public_url TEXT,
      mime_type TEXT,
      file_size INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (message_id) REFERENCES messages_lite(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS conversation_ai_state_lite (
      conversation_id INTEGER PRIMARY KEY,
      ai_enabled INTEGER NOT NULL DEFAULT 1,
      current_intent TEXT,
      intent_confidence REAL,
      lead_temperature REAL,
      ai_message_count INTEGER DEFAULT 0,
      customer_message_count INTEGER DEFAULT 0,
      needs_human INTEGER DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES conversations_lite(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone_number TEXT NOT NULL UNIQUE,
      first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_seen_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  await run(`CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone_number)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_contacts_last_seen ON contacts(last_seen_at)`);

  await run(`
    CREATE TABLE IF NOT EXISTS follow_up_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER,
      contact_id TEXT NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      run_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      sent_at TEXT,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    )
  `);
  await run(`CREATE INDEX IF NOT EXISTS idx_follow_up_jobs_run_at ON follow_up_jobs(run_at)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_follow_up_jobs_status ON follow_up_jobs(status)`);

  await run(`
    CREATE TABLE IF NOT EXISTS patient_memory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_id TEXT NOT NULL UNIQUE,
      patient_name TEXT,
      interests TEXT,
      last_procedure_discussed TEXT,
      last_intent TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  await run(`CREATE INDEX IF NOT EXISTS idx_patient_memory_contact ON patient_memory(contact_id)`);

  await run(`
    CREATE TABLE IF NOT EXISTS procedures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      price TEXT,
      duration TEXT,
      category TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  await run(`CREATE INDEX IF NOT EXISTS idx_procedures_name ON procedures(name)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_procedures_active ON procedures(active)`);

  await run(`
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_name TEXT,
      contact_id TEXT,
      procedure TEXT,
      appointment_date TEXT,
      appointment_time TEXT,
      professional TEXT,
      status TEXT,
      source TEXT NOT NULL DEFAULT 'clinicexperts',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  await ensureColumns("appointments", {
    contact_id: "TEXT",
  });
  await run(`CREATE INDEX IF NOT EXISTS idx_appointments_date_time ON appointments(appointment_date, appointment_time)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_name)`);
}

module.exports = { migrate };
