// Import clinic procedures from CSV into SQLite.
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
  if (["nome", "procedimento", "procedure", "name"].includes(key)) return "name";
  if (["descricao", "description", "detalhe", "detalhes"].includes(key)) return "description";
  if (["preco", "valor", "price"].includes(key)) return "price";
  if (["duracao", "duracao min", "tempo", "duration"].includes(key)) return "duration";
  if (["categoria", "category"].includes(key)) return "category";
  if (["ativo", "active", "status"].includes(key)) return "active";
  return null;
}

function parseActive(value) {
  const v = (value || "").toString().trim().toLowerCase();
  if (!v) return 1;
  if (["0", "false", "nao", "não", "inativo", "inactive"].includes(v)) return 0;
  return 1;
}

async function importProcedures(filePath) {
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

  let inserted = 0;
  let skipped = 0;

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    const record = {};
    for (let c = 0; c < headerMap.length; c += 1) {
      const key = headerMap[c];
      if (!key) continue;
      record[key] = (row[c] || "").toString().trim();
    }

    if (!record.name) continue;

    const existing = await get("SELECT id FROM procedures WHERE name = ?", [record.name]);
    if (existing) {
      skipped += 1;
      continue;
    }

    await run(
      `
      INSERT INTO procedures (name, description, price, duration, category, active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `,
      [
        record.name,
        record.description || null,
        record.price || null,
        record.duration || null,
        record.category || null,
        parseActive(record.active),
      ]
    );
    inserted += 1;
  }

  console.log(`Inserted: ${inserted} procedures`);
  console.log(`Skipped: ${skipped} duplicates`);
}

const defaultPath = path.join(__dirname, "..", "data", "relatorio-procedimentos.csv");
const csvPath = process.argv[2] || defaultPath;

importProcedures(csvPath).catch((error) => {
  console.error(error.message);
  process.exit(1);
});
