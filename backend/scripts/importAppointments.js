// Import clinic appointments from CSV into SQLite.
const fs = require("fs");
const path = require("path");
const { get, run } = require("../database/db");

function detectDelimiter(headerLine) {
  const commaCount = (headerLine.match(/,/g) || []).length;
  const semiCount = (headerLine.match(/;/g) || []).length;
  return semiCount > commaCount ? ";" : ",";
}

function parseCsv(content, delimiter) {
  const rows = [];
  let current = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const next = content[i + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        field += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      current.push(field);
      field = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      current.push(field);
      if (current.some((value) => value.trim() !== "")) {
        rows.push(current);
      }
      current = [];
      field = "";
      continue;
    }

    field += char;
  }

  if (field.length || current.length) {
    current.push(field);
    if (current.some((value) => value.trim() !== "")) {
      rows.push(current);
    }
  }

  return rows;
}

function normalizeHeader(text) {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function mapHeader(header) {
  const key = normalizeHeader(header);
  if (["paciente", "patient", "nome", "name"].includes(key)) return "patient_name";
  if (
    ["contato", "contact", "telefone", "whatsapp", "telefone whatsapp", "celular", "phone", "contact_id"].includes(
      key
    )
  )
    return "contact_id";
  if (["procedimentos", "procedimento", "procedure", "tratamento"].includes(key)) return "procedure";
  if (["data", "data do agendamento", "appointment date", "date"].includes(key)) return "appointment_date";
  if (["hora", "horario", "appointment time", "time"].includes(key)) return "appointment_time";
  if (["profissional", "professional", "especialista"].includes(key)) return "professional";
  if (["status", "situacao", "situaÃ§Ã£o"].includes(key)) return "status";
  return null;
}

function normalizeDate(value) {
  if (!value) return "";
  const trimmed = value.trim();
  const parts = trimmed.split(" ")[0].split("/");
  if (parts.length !== 3) return trimmed;
  const [day, month, year] = parts;
  if (!day || !month || !year) return trimmed;
  const dd = day.padStart(2, "0");
  const mm = month.padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function normalizeTime(value) {
  if (!value) return "";
  const trimmed = value.trim().toLowerCase();
  let raw = trimmed;
  if (raw.includes(" ")) {
    raw = raw.split(" ")[1] || raw.split(" ")[0];
  }
  raw = raw.replace("h", ":").replace(/[^0-9:]/g, "");
  const parts = raw.split(":").filter(Boolean);
  if (!parts.length) return "";
  const hour = (parts[0] || "0").padStart(2, "0");
  const minute = (parts[1] || "0").padStart(2, "0");
  return `${hour}:${minute}`;
}

function normalizePhone(value) {
  if (!value) return "";
  const digits = value.toString().replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55")) return digits;
  return `55${digits}`;
}


async function importAppointments(filePath) {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`CSV not found: ${absolutePath}`);
  }

  const content = fs.readFileSync(absolutePath, "utf-8");
  const [headerLine] = content.split(/\r?\n/);
  const delimiter = detectDelimiter(headerLine || "");
  const rows = parseCsv(content, delimiter);
  if (!rows.length) {
    throw new Error("CSV is empty.");
  }

  const headers = rows[0].map((h) => h.trim());
  const headerMap = headers.map(mapHeader);

  let imported = 0;
  let skipped = 0;

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    const record = {};
    for (let c = 0; c < headerMap.length; c += 1) {
      const key = headerMap[c];
      if (!key) continue;
      record[key] = (row[c] || "").toString().trim();
    }

    if (!record.patient_name || !record.appointment_date) continue;
    if (!record.appointment_time) {
      const parts = record.appointment_date.split(" ");
      if (parts.length >= 2) {
        record.appointment_date = parts[0];
        record.appointment_time = parts[1];
      }
    }
    record.appointment_date = normalizeDate(record.appointment_date);
    record.appointment_time = normalizeTime(record.appointment_time);
    if (record.contact_id) {
      record.contact_id = normalizePhone(record.contact_id);
      if (!record.contact_id) record.contact_id = null;
    }
    if (!record.appointment_time || !record.appointment_date) continue;

    const existing = await get(
      `
      SELECT id FROM appointments
      WHERE patient_name = ? AND appointment_date = ? AND appointment_time = ?
      `,
      [record.patient_name, record.appointment_date, record.appointment_time]
    );
    if (existing) {
      skipped += 1;
      continue;
    }

    await run(
      `
      INSERT INTO appointments
        (patient_name, contact_id, procedure, appointment_date, appointment_time, professional, status, source, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'clinicexperts', datetime('now'))
      `,
      [
        record.patient_name,
        record.contact_id || null,
        record.procedure || null,
        record.appointment_date,
        record.appointment_time,
        record.professional || null,
        record.status || null,
      ]
    );
    imported += 1;
  }

  console.log(`Imported ${imported} appointments`);
  console.log(`Skipped ${skipped} duplicates`);
}

const defaultPath = path.join(__dirname, "..", "data", "relatorio-agendamentos.csv");
const csvPath = process.argv[2] || defaultPath;

importAppointments(csvPath).catch((error) => {
  console.error(error.message);
  process.exit(1);
});


